import { useMutation } from "@tanstack/react-query";
import { saveWorkflow } from "../../services/api";
import type { Graph } from "../../types";

export function useSaveWorkflow() {
  return useMutation({
    mutationFn: ({ appId, graph }: { appId: string; graph: Graph }) =>
      saveWorkflow(appId, graph),
  });
}
