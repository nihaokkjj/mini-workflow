import { useQuery } from "@tanstack/react-query";
import { getWorkflowByApp } from "../../services/api";
import { workflowKeys } from "./keys";

export function useWorkflow(appId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.byApp(appId ?? ""),
    queryFn: async () => {
      const { data } = await getWorkflowByApp(appId!);
      return data;
    },
    enabled: Boolean(appId),
  });
}
