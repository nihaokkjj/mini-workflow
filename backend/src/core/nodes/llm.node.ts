import { BaseNode } from "./base.node";
import { NodeType, GraphEngineEvent } from "../../types";

/**
 * LLMNode — calls an OpenAI-compatible LLM via fetch with streaming.
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
    abortSignal?: AbortSignal
  ): AsyncGenerator<string> {
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const err = (await response.json()) as { error?: { message?: string } };
        detail = err.error?.message ? `: ${err.error.message}` : "";
      } catch {
        detail = "";
      }
      throw new Error(`LLM API returned ${response.status}${detail}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("LLM API returned empty response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const jsonStr = trimmed.slice(5).replace(/^ /, "");
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta as
              | {
                  content?: string;
                  reasoning_content?: string;
                }
              | undefined;
            const text = delta?.content || delta?.reasoning_content || "";
            if (text) yield text;
          } catch {
            // skip unparseable lines
          }
        }
      }

      // Flush remaining buffer
      for (const line of buffer.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).replace(/^ /, "");
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta as
            | {
                content?: string;
                reasoning_content?: string;
              }
            | undefined;
          const text = delta?.content || delta?.reasoning_content || "";
          if (text) yield text;
        } catch {
          // skip
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async *run(): AsyncGenerator<GraphEngineEvent> {
    const nodeId = this.config.id;
    const data = this.config.data;
    const configuredApiKey =
      typeof data.apiKey === "string" ? data.apiKey.trim() : "";
    const configuredBaseURL =
      typeof data.baseURL === "string" ? data.baseURL.trim() : "";

    yield {
      event: "node_start",
      nodeId,
      nodeType: "llm",
      timestamp: Date.now(),
    };

    // Allow each workflow node to target its own provider credentials while
    // still falling back to process envs for existing deployments.
    const apiKey =
      configuredApiKey || process.env.OPENAI_API_KEY || "sk-placeholder";
    const baseURL = (
      configuredBaseURL ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = (data.model as string) || "gpt-4o-mini";
    const inputs = this.getInputs();
    const systemPrompt = this.resolveTemplate(
      (data.systemPrompt as string) || "You are a helpful assistant."
    );
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
        this.context.abortSignal
      )) {
        fullText += text;
        yield { event: "node_chunk", nodeId, text, timestamp: Date.now() };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield {
        event: "error",
        nodeId,
        nodeType: "llm",
        message,
        timestamp: Date.now(),
      };
      return;
    }

    if (!fullText) {
      yield {
        event: "error",
        nodeId,
        nodeType: "llm",
        message:
          "LLM returned empty response — check API key and base URL configuration",
        timestamp: Date.now(),
      };
      return;
    }

    const outputs = { text: fullText, model };
    this.pool.setNodeOutput(nodeId, outputs);
    yield { event: "node_end", nodeId, outputs, timestamp: Date.now() };
  }
}
