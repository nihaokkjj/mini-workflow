import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";
import { request } from "https";
import { URL } from "url";

/**
 * LLMNode — calls an OpenAI-compatible LLM via raw HTTPS streaming.
 * Yields each chunk as it arrives so the caller can stream it to the client.
 */
export class LLMNode extends BaseNode {
  readonly nodeType: NodeType = "llm";

  private async *streamRequest(
    baseURL: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<string> {
    if (abortSignal?.aborted) {
      throw new Error("Run was canceled");
    }

    const parsed = new URL(`${baseURL}/chat/completions`);
    const queue: Array<{ text: string } | { error: string }> = [];
    let finished = false;

    const pushText = (text: string) => {
      if (text) queue.push({ text });
    };

    const pushError = (message: string) => {
      queue.push({ error: message });
      finished = true;
    };

    const processLine = (line: string) => {
      const trimmed = line.trim();
      // Handle both "data: " and "data:" (Kimi sends no space)
      if (!trimmed.startsWith("data:")) return;
      const jsonStr = trimmed.slice(5).replace(/^ /, "");
      if (jsonStr === "[DONE]") return;
      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices?.[0]?.delta as { content?: string; reasoning_content?: string } | undefined;
        const text = delta?.content || delta?.reasoning_content || "";
        if (text) pushText(text);
      } catch { /* skip */ }
    };

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
        let buffer = "";

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) processLine(line);
        });

        res.on("end", () => {
          for (const line of buffer.split("\n")) processLine(line);
          finished = true;
        });

        res.on("error", (err) => pushError(err.message));
      },
    );

    req.on("error", (err) => pushError(err.message));

    const abortHandler = () => {
      req.destroy();
      pushError("Run was canceled");
    };
    abortSignal?.addEventListener("abort", abortHandler, { once: true });

    req.on("timeout", () => {
      req.destroy();
      pushError("LLM request timed out");
    });

    req.write(
      JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    );
    req.end();

    try {
      while (!finished || queue.length > 0) {
        if (queue.length > 0) {
          const item = queue.shift()!;
          if ("error" in item) {
            throw new Error(item.error);
          }
          yield item.text;
        } else {
          // Wait briefly for the next chunk; keeps the async generator responsive
          // without busy-waiting.
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    } finally {
      abortSignal?.removeEventListener("abort", abortHandler);
    }
  }

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;

    yield { event: "node_start", nodeId, nodeType: "llm", timestamp: Date.now() };

    const apiKey = process.env.OPENAI_API_KEY ?? "sk-placeholder";
    const baseURL = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = (data.model as string) || "gpt-4o-mini";
    const inputs = this.getInputs();
    const systemPrompt = this.resolveTemplate((data.systemPrompt as string) || "You are a helpful assistant.");
    const userPrompt = this.resolveTemplate(
      (data.userPrompt as string) || (inputs.prompt as string) || "Hello"
    );

    let fullText = "";
    try {
      for await (const text of this.streamRequest(
        baseURL,
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        this.context.abortSignal,
      )) {
        fullText += text;
        yield { event: "node_chunk", nodeId, text, timestamp: Date.now() };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield { event: "error", nodeId, nodeType: "llm", message, timestamp: Date.now() };
      return;
    }

    const outputs = { text: fullText || "(empty)", model };
    this.pool.setNodeOutput(nodeId, outputs);
    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }
}
