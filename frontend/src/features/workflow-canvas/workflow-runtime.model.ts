import type {
  GraphEngineEvent,
  NodeConfig,
  RetrievalResultDto,
} from "../../types";
import { isRetrievalResultDto } from "../retrieval-debug/retrieval-debug.model";

export interface NodeRunResult {
  nodeId: string;
  nodeType: string;
  outputs: Record<string, unknown>;
  timestamp: number;
}

export interface CollapsibleTextState {
  preview: string;
  isCollapsedByDefault: boolean;
}

export function collectNodeRunResults(
  events: GraphEngineEvent[],
  nodes: NodeConfig[]
): NodeRunResult[] {
  return events
    .filter(
      (event): event is Extract<GraphEngineEvent, { event: "node_end" }> =>
        event.event === "node_end"
    )
    .map((event) => ({
      nodeId: event.nodeId,
      nodeType:
        nodes.find((node) => node.id === event.nodeId)?.type ?? "unknown",
      outputs: event.outputs,
      timestamp: event.timestamp,
    }))
    .reverse();
}

export function getCollapsibleTextState(
  text: string,
  maxLength = 240
): CollapsibleTextState {
  if (text.length <= maxLength) {
    return {
      preview: text,
      isCollapsedByDefault: false,
    };
  }

  return {
    preview: `${text.slice(0, maxLength).trimEnd()}...`,
    isCollapsedByDefault: true,
  };
}

export function readRetrievalRunOutput(
  outputs: Record<string, unknown>
): RetrievalResultDto | null {
  return isRetrievalResultDto(outputs) ? outputs : null;
}
