import { useQuery } from "@tanstack/react-query";
import { listConversations } from "../../services/api";
import { conversationKeys } from "./keys";

export function useConversations(appId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.byApp(appId ?? ""),
    queryFn: () => listConversations(appId!),
    enabled: Boolean(appId),
    select: (res) => res.data,
  });
}
