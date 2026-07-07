export const conversationKeys = {
  byApp: (appId: string) => ["conversations", "by-app", appId] as const,
  messages: (id: string) => ["conversations", id, "messages"] as const,
};
