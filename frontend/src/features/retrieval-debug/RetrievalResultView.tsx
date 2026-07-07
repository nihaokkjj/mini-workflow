import type {
  RetrievalDroppedHitDto,
  RetrievalHitDto,
  RetrievalResultDto,
} from "../../types";
import { CollapsibleTextBlock } from "./CollapsibleTextBlock";

function HitList({
  title,
  hits,
  emptyText,
}: {
  title: string;
  hits: Array<RetrievalHitDto | RetrievalDroppedHitDto>;
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20">
      <div className="border-b border-white/8 px-3 py-2 text-sm font-medium text-white/70">
        {title}
      </div>
      {hits.length === 0 ? (
        <div className="px-3 py-3 text-xs text-white/40">{emptyText}</div>
      ) : (
        <div className="divide-y divide-white/5">
          {hits.map((hit) => (
            <div
              key={`${hit.segmentId}-${"reason" in hit ? hit.reason : "kept"}`}
              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="truncate font-mono text-white/70">
                  {hit.segmentId}
                </div>
                {"reason" in hit && (
                  <div className="mt-1 text-amber-400">{hit.reason}</div>
                )}
              </div>
              <div className="shrink-0 rounded-full bg-white/5 px-2 py-1 font-medium text-white/50">
                {hit.score.toFixed(3)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RetrievalResultView({
  result,
  contextPreviewLength = 260,
}: {
  result: RetrievalResultDto;
  contextPreviewLength?: number;
}) {
  const selectedDatasetIds = result.trace.selectedDatasetIds;
  const requestedDatasetIds = result.trace.requestedDatasetIds;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
            Query
          </div>
          <div className="mt-2 text-sm text-white/70">{result.query}</div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
            Retrieval Mode
          </div>
          <div className="mt-2 text-sm font-semibold text-white/70">
            {result.trace.plan.retrievalMode}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
            Sources
          </div>
          <div className="mt-2 text-sm font-semibold text-white/70">
            {result.sourceCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
            Datasets
          </div>
          <div className="mt-2 text-sm font-semibold text-white/70">
            {selectedDatasetIds.length}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {/* Dataset Selection */}
          <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-4">
            <div className="text-sm font-medium text-white/70">
              Dataset Selection
            </div>
            <div className="mt-2 text-xs text-white/40">
              {result.trace.usedExplicitSelection
                ? "Using an explicit dataset selection from the request or node config."
                : "No explicit dataset selection was provided, so the app's bound datasets were used."}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-white/30">
                  Requested
                </div>
                <div className="mt-2 space-y-1">
                  {(requestedDatasetIds.length > 0
                    ? requestedDatasetIds
                    : ["All bound datasets"]
                  ).map((datasetId) => (
                    <div
                      key={datasetId}
                      className="truncate rounded-full bg-white/5 px-2 py-1 text-xs text-white/50"
                    >
                      {datasetId}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-white/30">
                  Selected
                </div>
                <div className="mt-2 space-y-1">
                  {selectedDatasetIds.map((datasetId) => (
                    <div
                      key={datasetId}
                      className="truncate rounded-full bg-accent/15 px-2 py-1 text-xs text-accent"
                    >
                      {datasetId}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.8px] text-white/30">
                  Plan
                </div>
                <div className="mt-2 space-y-1 text-xs text-white/50">
                  <div>topK: {result.trace.plan.topK}</div>
                  <div>candidateK: {result.trace.plan.candidateK}</div>
                  <div>threshold: {result.trace.plan.scoreThreshold}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Hit lists */}
          <div className="grid gap-4 lg:grid-cols-3">
            <HitList
              title="Raw Hits"
              hits={result.trace.rawHits}
              emptyText="No raw hits were returned."
            />
            <HitList
              title="Filtered Hits"
              hits={result.trace.filteredHits}
              emptyText="No hit survived threshold filtering."
            />
            <HitList
              title="Dropped Hits"
              hits={result.trace.droppedHits}
              emptyText="No hit was dropped by the threshold."
            />
          </div>

          <CollapsibleTextBlock
            text={result.context}
            maxPreviewLength={contextPreviewLength}
          />
        </div>

        {/* Sources */}
        <div className="rounded-xl border border-white/8 bg-black/20">
          <div className="border-b border-white/8 px-4 py-3 text-sm font-medium text-white/70">
            Sources
          </div>
          {result.sources.length === 0 ? (
            <div className="px-4 py-4 text-sm text-white/40">
              No source survived the retrieval pipeline.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {result.sources.map((source) => (
                <div key={source.segmentId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white/80">
                        {source.documentName}
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        {source.datasetName} · segment {source.position}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-xs font-medium text-white/50">
                      {source.score.toFixed(3)}
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-[#0d0d14] px-3 py-3 text-xs leading-5 text-white/60">
                    {source.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
