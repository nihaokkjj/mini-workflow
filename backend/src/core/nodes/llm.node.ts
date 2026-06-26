import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";
import { request } from "https";
import { URL } from "url";

type SSEDelta = { content?: string; reasoning_content?: string };

function postStream(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; stream: NodeJS.ReadableStream }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        timeout: 60000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`)));
          return;
        }
        resolve({ status: res.statusCode ?? 200, stream: res });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.write(body);
    req.end();
  });
}

/**
 * LLMNode — calls an OpenAI-compatible LLM via raw HTTPS streaming.
 */
export class LLMNode extends BaseNode {
  readonly nodeType: NodeType = "llm";

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;

    yield { event: "node_start", nodeId, nodeType: "llm", timestamp: Date.now() };

    const apiKey = process.env.OPENAI_API_KEY ?? "sk-placeholder";
    const baseURL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = (data.model as string) || "gpt-4o-mini";
    const systemPrompt = this.resolveTemplate((data.systemPrompt as string) || "You are a helpful assistant.");
    const userPrompt = this.resolveTemplate((data.userPrompt as string) || "Hello");

    try {
      const { stream } = await postStream(
        `${baseURL}/chat/completions`,
        { Authorization: `Bearer ${apiKey}` },
        JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      );

      let buffer = "";
      let fullText = "";
      let chunkCount = 0;

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta as SSEDelta | undefined;
            const text = delta?.content || delta?.reasoning_content || "";
            if (text) {
              chunkCount++;
              fullText += text;
              yield { event: "node_chunk", nodeId, text, timestamp: Date.now() };
            }
          } catch {
            // Skip unparseable
          }
        }
      }

      // Also process remaining buffer
      for (const line of buffer.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed.slice(6) === "[DONE]") continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const delta = parsed.choices?.[0]?.delta as SSEDelta | undefined;
          const text = delta?.content || delta?.reasoning_content || "";
          if (text) {
            fullText += text;
            yield { event: "node_chunk", nodeId, text, timestamp: Date.now() };
          }
        } catch { /* skip */ }
      }

      const outputs = { text: fullText || "(empty)", model, chunkCount };
      this.pool.setNodeOutput(nodeId, outputs);
      this.pool.setNodeOutput("__last_output", { value: outputs.text });

      yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown LLM error";
      yield { event: "error", nodeId, error: message, timestamp: Date.now() };
    }
  }
}
