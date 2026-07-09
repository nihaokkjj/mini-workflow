import { useState } from "react";
import { useDebugRetrieve } from "../../queries/datasets/useDebugRetrieve";
import type { AppDatasetBindingDto, RetrievalResultDto } from "../../types";
import { RetrievalResultView } from "./RetrievalResultView";
import {
  buildRetrieveRequest,
  readScoreThresholdInput,
  readTopKInput,
  type RetrievalDebugFormState,
} from "./retrieval-debug.model";

interface RetrievalDebugDrawerProps {
  appId: string;
  appName: string;
  bindings: AppDatasetBindingDto[];
  onClose: () => void;
}

const defaultFormState: RetrievalDebugFormState = {
  query: "",
  datasetIds: [],
  topK: 4,
  scoreThreshold: 0.15,
  retrievalMode: "keyword",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-white/14 bg-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition";
const labelClass = "text-sm font-medium text-white/70";

export function RetrievalDebugDrawer({
  appId,
  appName,
  bindings,
  onClose,
}: RetrievalDebugDrawerProps) {
  const [form, setForm] = useState<RetrievalDebugFormState>(defaultFormState);
  const retrieveMutation = useDebugRetrieve();
  const [result, setResult] = useState<RetrievalResultDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDataset = (datasetId: string) => {
    setForm((current) => ({
      ...current,
      datasetIds: current.datasetIds.includes(datasetId)
        ? current.datasetIds.filter((id) => id !== datasetId)
        : [...current.datasetIds, datasetId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.query.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await retrieveMutation.mutateAsync(
        buildRetrieveRequest(appId, form)
      );
      setResult(data);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to run retrieval debug"
      );
      setResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close retrieval debug"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-5xl border-l border-white/8 bg-canvas">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-white/8 px-5 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
                Retrieval Debug
              </div>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {appName}
              </h2>
              <p className="mt-1 text-sm text-white/40">
                Run the retrieval pipeline directly and inspect datasets, hits,
                sources, trace, and the assembled context.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-white/30 transition hover:bg-white/5 hover:text-white/70"
            >
              ✕
            </button>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            {/* Form panel */}
            <div className="border-r border-white/8 bg-[#2a2346] px-5 py-5">
              <div className="space-y-4">
                <label className="block">
                  <div className={labelClass}>Query</div>
                  <textarea
                    className={`${inputClass} h-24`}
                    placeholder="Ask a retrieval-only question"
                    value={form.query}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="block">
                  <div className={labelClass}>Retrieval Mode</div>
                  <select
                    className={`${inputClass} bg-white/[0.12]`}
                    value={form.retrievalMode}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        retrievalMode: event.target
                          .value as RetrievalDebugFormState["retrievalMode"],
                      }))
                    }
                  >
                    <option value="keyword">keyword</option>
                    <option value="semantic">semantic</option>
                    <option value="hybrid">hybrid</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <div className={labelClass}>Top K</div>
                    <input
                      type="number"
                      min={1}
                      className={inputClass}
                      value={form.topK}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          topK: readTopKInput(event.target.value, current.topK),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className={labelClass}>Threshold</div>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step="0.01"
                      className={inputClass}
                      value={form.scoreThreshold}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scoreThreshold: readScoreThresholdInput(
                            event.target.value,
                            current.scoreThreshold
                          ),
                        }))
                      }
                    />
                  </label>
                </div>

                {/* Dataset selection */}
                <div className="rounded-xl border border-white/12 bg-white/[0.06] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white/70">
                        Datasets
                      </div>
                      <div className="mt-1 text-xs text-white/40">
                        Leave all unchecked to use every dataset bound to this
                        app.
                      </div>
                    </div>
                    {form.datasetIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({ ...current, datasetIds: [] }))
                        }
                        className="text-xs font-medium text-accent hover:text-accent-2 transition"
                      >
                        Use all
                      </button>
                    )}
                  </div>
                  {bindings.length === 0 ? (
                    <div className="mt-3 rounded-lg border border-dashed border-white/14 bg-white/[0.06] px-3 py-3 text-sm text-white/45">
                      No dataset is currently bound to this app.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {bindings.map((binding) => (
                        <label
                          key={binding.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/8 px-3 py-3"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 accent-accent"
                            checked={form.datasetIds.includes(
                              binding.datasetId
                            )}
                            onChange={() => toggleDataset(binding.datasetId)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white/70">
                              {binding.dataset.name}
                            </div>
                            <div className="mt-1 truncate font-mono text-[11px] text-white/30">
                              {binding.datasetId}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !form.query.trim()}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
                  }}
                >
                  {isSubmitting ? "Running..." : "Run Retrieval Debug"}
                </button>
              </div>
            </div>

            {/* Results panel */}
            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {result ? (
                <RetrievalResultView result={result} />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 px-6 text-center text-sm text-white/40">
                  Run a retrieval query to inspect trace, hits, sources, and the
                  final context.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
