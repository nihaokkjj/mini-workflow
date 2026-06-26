import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";
import { request } from "https";
import { URL } from "url";

/**
 * LLMNode — calls an OpenAI-compatible LLM via raw HTTPS streaming.
 * Collects all chunks via event listeners, then yields them as events.
 */
export class LLMNode extends BaseNode {
  readonly nodeType: NodeType = "llm";

  private streamRequest(
    baseURL: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ texts: string[]; error?: string }> {
    return new Promise((resolve) => {
      const parsed = new URL(`${baseURL}/chat/completions`);
      const req = request(
        {
          hostname: parsed.hostname,
          port: parsed.port || 443,
          path: parsed.pathname + parsed.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 60000,
        },
        (res) => {
          const texts: string[] = [];
          let buffer = "";

          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ") || trimmed.slice(6) === "[DONE]") continue;
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta as { content?: string; reasoning_content?: string } | undefined;
                const text = delta?.content || delta?.reasoning_content || "";
                if (text) texts.push(text);
              } catch { /* skip */ }
            }
          });

          res.on("end", () => {
            // Process remaining buffer
            for (const line of buffer.split("\n")) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ") || trimmed.slice(6) === "[DONE]") continue;
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const delta = parsed.choices?.[0]?.delta as { content?: string; reasoning_content?: string } | undefined;
                const text = delta?.content || delta?.reasoning_content || "";
                if (text) texts.push(text);
              } catch { /* skip */ }
            }
            resolve({ texts });
          });

          res.on("error", (err) => resolve({ texts, error: err.message }));
        },
      );

      req.on("error", (err) => {
        console.error(`[LLMNode] req error: ${err.message}`);
        resolve({ texts: [], error: err.message });
      });
      req.on("timeout", () => {
        console.error("[LLMNode] req timeout");
        req.destroy();
        resolve({ texts: [], error: "LLM request timed out" });
      });

      req.write(JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }));
      req.end();
    });
  }

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;

    yield { event: "node_start", nodeId, nodeType: "llm", timestamp: Date.now() };

    const apiKey = process.env.OPENAI_API_KEY ?? "sk-placeholder";
    const baseURL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = (data.model as string) || "gpt-4o-mini";
    const systemPrompt = this.resolveTemplate((data.systemPrompt as string) || "You are a helpful assistant.");
    const userPrompt = this.resolveTemplate((data.userPrompt as string) || "Hello");

    console.error(`[LLMNode] Calling ${baseURL} with model=${model}`);
    const { texts, error } = await this.streamRequest(baseURL, apiKey, model, systemPrompt, userPrompt);
    console.error(`[LLMNode] Response: texts=${texts.length}, error=${error || "none"}`);

    if (error) {
      yield { event: "error", nodeId, error, timestamp: Date.now() };
      return;
    }

    // Yield buffered chunks
    let fullText = "";
    for (const t of texts) {
      fullText += t;
      yield { event: "node_chunk", nodeId, text: t, timestamp: Date.now() };
    }

    const outputs = { text: fullText || "(empty)", model };
    this.pool.setNodeOutput(nodeId, outputs);
    this.pool.setNodeOutput("__last_output", { value: outputs.text });
    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }
}
