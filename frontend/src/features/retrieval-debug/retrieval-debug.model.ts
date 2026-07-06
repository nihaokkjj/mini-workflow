import type { RetrieveRequestDto, RetrievalResultDto } from "../../types";

export interface RetrievalDebugFormState {
  query: string;
  datasetIds: string[];
  topK: number;
  scoreThreshold: number;
  retrievalMode: "keyword" | "semantic" | "hybrid";
}

function isRetrievalHit(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as { segmentId?: unknown }).segmentId === "string" &&
    typeof (value as { score?: unknown }).score === "number"
  );
}

function isDroppedRetrievalHit(value: unknown): boolean {
  return Boolean(
    isRetrievalHit(value) &&
    typeof (value as { reason?: unknown }).reason === "string"
  );
}

export function buildRetrieveRequest(
  appId: string,
  form: RetrievalDebugFormState
): RetrieveRequestDto {
  const trimmedQuery = form.query.trim();

  return {
    appId,
    query: trimmedQuery,
    datasetIds: form.datasetIds.length > 0 ? form.datasetIds : undefined,
    topK: form.topK,
    scoreThreshold: form.scoreThreshold,
    retrievalMode: form.retrievalMode,
  };
}

export function readTopKInput(rawValue: string, currentValue: number): number {
  if (rawValue.trim().length === 0) {
    return currentValue;
  }

  const nextValue = Number(rawValue);

  if (!Number.isInteger(nextValue) || nextValue < 1) {
    return currentValue;
  }

  return nextValue;
}

export function readScoreThresholdInput(
  rawValue: string,
  currentValue: number
): number {
  if (rawValue.trim().length === 0) {
    return currentValue;
  }

  const nextValue = Number(rawValue);

  if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > 1) {
    return currentValue;
  }

  return nextValue;
}

export function isRetrievalResultDto(
  value: unknown
): value is RetrievalResultDto {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RetrievalResultDto>;
  const trace = candidate.trace;

  return (
    typeof candidate.query === "string" &&
    typeof candidate.context === "string" &&
    typeof candidate.sourceCount === "number" &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.hits) &&
    candidate.hits.every(
      (hit) =>
        hit &&
        typeof hit === "object" &&
        typeof hit.segmentId === "string" &&
        typeof hit.score === "number"
    ) &&
    Array.isArray(candidate.sources) &&
    candidate.sources.every(
      (source) =>
        source &&
        typeof source === "object" &&
        typeof source.segmentId === "string" &&
        typeof source.documentName === "string" &&
        typeof source.datasetName === "string" &&
        typeof source.content === "string" &&
        typeof source.score === "number"
    ) &&
    typeof trace === "object" &&
    trace !== null &&
    Array.isArray(trace.requestedDatasetIds) &&
    Array.isArray(trace.availableDatasetIds) &&
    Array.isArray(trace.selectedDatasetIds) &&
    typeof trace.usedExplicitSelection === "boolean" &&
    typeof trace.plan === "object" &&
    trace.plan !== null &&
    typeof trace.plan.retrievalMode === "string" &&
    typeof trace.plan.topK === "number" &&
    typeof trace.plan.scoreThreshold === "number" &&
    typeof trace.plan.candidateK === "number" &&
    typeof trace.plan.contextBudgetTokens === "number" &&
    typeof trace.plan.enableQueryRewrite === "boolean" &&
    Array.isArray(trace.rawHits) &&
    trace.rawHits.every(isRetrievalHit) &&
    Array.isArray(trace.filteredHits) &&
    trace.filteredHits.every(isRetrievalHit) &&
    Array.isArray(trace.droppedHits) &&
    trace.droppedHits.every(isDroppedRetrievalHit)
  );
}
