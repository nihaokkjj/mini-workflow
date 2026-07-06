import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteApp } from "../../services/api";
import { appKeys } from "./keys";

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteApp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appKeys.all }),
  });
}
