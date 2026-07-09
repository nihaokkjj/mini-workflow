import { Response } from "express";
import { GraphEngineEvent } from "../../types";

/**
 * Set standard SSE headers and flush them to the client.
 */
export function setupSSE(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

/**
 * Write a single GraphEngineEvent to the SSE response as an `event: <type>` line
 * followed by `data: <JSON>`.
 */
export function writeSSEEvent(res: Response, event: GraphEngineEvent): void {
  res.write(`event: ${event.event}\ndata: ${JSON.stringify(event)}\n\n`);
}

/**
 * Write an error event to the SSE response and close the stream.
 */
export function writeSSEError(res: Response, message: string): void {
  const errorEvent: GraphEngineEvent = {
    event: "error",
    nodeId: null,
    nodeType: null,
    message,
    timestamp: Date.now(),
  };
  writeSSEEvent(res, errorEvent);
  res.end();
}

/**
 * Pipe an async generator of GraphEngineEvent into an SSE response.
 * Calls `onGraphEnd` when a graph_end event is yielded, and sends any
 * errors through a final SSE error event before closing the stream.
 */
export async function pipeSSEStream(
  res: Response,
  stream: AsyncGenerator<GraphEngineEvent>,
  onGraphEnd?: (outputs: Record<string, unknown>) => void
): Promise<void> {
  try {
    for await (const event of stream) {
      writeSSEEvent(res, event);
      if (event.event === "graph_end" && onGraphEnd) {
        onGraphEnd(event.outputs as Record<string, unknown>);
      }
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown execution error";
    writeSSEEvent(res, {
      event: "error",
      nodeId: null,
      nodeType: null,
      message,
      timestamp: Date.now(),
    });
  } finally {
    res.end();
  }
}
