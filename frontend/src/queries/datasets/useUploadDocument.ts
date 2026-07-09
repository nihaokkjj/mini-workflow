import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "../../services/api";
import { datasetKeys } from "./keys";

export function useUploadDocument(datasetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, name }: { file: File; name: string }) =>
      uploadDocument(datasetId, file, name).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: datasetKeys.documents(datasetId),
      });
    },
  });
}
