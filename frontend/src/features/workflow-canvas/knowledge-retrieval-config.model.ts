export function readSelectedDatasetIds(
  data: Record<string, unknown>
): string[] {
  if (!Array.isArray(data.datasetIds)) {
    return [];
  }

  return Array.from(
    new Set(
      data.datasetIds.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    )
  );
}

export function setExplicitDatasetSelection(
  data: Record<string, unknown>,
  datasetIds: string[]
): Record<string, unknown> {
  return {
    ...data,
    datasetIds: Array.from(
      new Set(datasetIds.filter((datasetId) => datasetId.trim().length > 0))
    ),
  };
}

export function toggleExplicitDatasetSelection(
  data: Record<string, unknown>,
  datasetId: string
): Record<string, unknown> {
  const selectedDatasetIds = readSelectedDatasetIds(data);

  if (selectedDatasetIds.includes(datasetId)) {
    return setExplicitDatasetSelection(
      data,
      selectedDatasetIds.filter((selectedId) => selectedId !== datasetId)
    );
  }

  return setExplicitDatasetSelection(data, [...selectedDatasetIds, datasetId]);
}

export function clearExplicitDatasetSelection(
  data: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...data,
    datasetIds: [],
  };
}
