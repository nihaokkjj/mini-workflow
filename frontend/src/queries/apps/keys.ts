export const appKeys = {
  all: ["apps"] as const,
  detail: (id: string) => [...appKeys.all, id] as const,
};
