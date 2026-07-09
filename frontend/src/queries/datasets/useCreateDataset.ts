import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDataset } from "../../services/api";
import type { CreateDatasetDto } from "../../types";
import { datasetKeys } from "./keys";

export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDatasetDto) =>
      createDataset(dto).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
}
