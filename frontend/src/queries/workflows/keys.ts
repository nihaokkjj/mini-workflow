export const workflowKeys = {
  byApp: (appId: string) => ["workflows", "by-app", appId] as const,
};
