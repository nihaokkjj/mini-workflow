export const datasetKeys = {
  all: ["datasets"] as const,
  details: (datasetId: string) =>
    [...datasetKeys.all, "details", datasetId] as const,
  documents: (datasetId: string) =>
    [...datasetKeys.all, "documents", datasetId] as const,
  appBindings: (appId: string) =>
    [...datasetKeys.all, "bindings", appId] as const,
};
