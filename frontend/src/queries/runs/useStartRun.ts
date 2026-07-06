import { useMutation } from "@tanstack/react-query";
import { startRun } from "../../services/api";

export function useStartRun() {
  return useMutation({
    mutationFn: ({
      workflowId,
      inputs,
    }: {
      workflowId: string;
      inputs: Record<string, unknown>;
    }) => startRun(workflowId, inputs),
  });
}
