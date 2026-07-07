import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../services/api";
import { conversationKeys } from "./keys";

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId ?? ""),
    queryFn: () => getMessages(conversationId!),
    enabled: Boolean(conversationId),
    select: (res) => res.data,
  });
}
