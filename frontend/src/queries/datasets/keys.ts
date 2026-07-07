export const datasetKeys = {
  all: ["datasets"] as const,
  appBindings: (appId: string) =>
    [...datasetKeys.all, "bindings", appId] as const,
};
