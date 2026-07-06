import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createApp } from "../../services/api";
import { appKeys } from "./keys";

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      mode,
    }: {
      name: string;
      mode?: "chat" | "workflow";
    }) => createApp(name, mode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appKeys.all }),
  });
}
