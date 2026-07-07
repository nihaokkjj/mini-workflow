import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation } from "../../services/api";
import { conversationKeys } from "./keys";

export function useDeleteConversation(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: conversationKeys.byApp(appId),
      }),
  });
}
