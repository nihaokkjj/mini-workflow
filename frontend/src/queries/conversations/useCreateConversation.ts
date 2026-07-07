import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConversation } from "../../services/api";
import { conversationKeys } from "./keys";

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => createConversation(appId),
    onSuccess: (_, appId) =>
      queryClient.invalidateQueries({
        queryKey: conversationKeys.byApp(appId),
      }),
  });
}
