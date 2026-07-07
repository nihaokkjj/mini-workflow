import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unbindAppDataset } from "../../services/api";
import { datasetKeys } from "./keys";

export function useUnbindAppDataset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => unbindAppDataset(appId, datasetId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: datasetKeys.appBindings(appId),
      }),
  });
}
