import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bindAppDataset } from "../../services/api";
import { datasetKeys } from "./keys";

export function useBindAppDataset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => bindAppDataset(appId, datasetId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: datasetKeys.appBindings(appId),
      }),
  });
}
