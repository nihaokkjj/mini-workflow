import { useRef } from "react";
import type { NodeType } from "../../../types";

export function useNodeIds() {
  const counterRef = useRef(0);

  const nextId = (type: NodeType) => {
    counterRef.current += 1;
    return `${type}-${counterRef.current}`;
  };

  const syncCounter = (nodes: Array<{ id: string }>) => {
    const maxSeen = nodes.reduce((max, node) => {
      const suffix = Number(node.id.match(/-(\d+)$/)?.[1] ?? 0);
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, counterRef.current);
    counterRef.current = maxSeen;
  };

  return { nextId, syncCounter };
}
