import { useState } from "react";
import { debugRetrieve } from "../../services/api";
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

export function RetrievalDebugDrawer({
  appId,
  appName,
  bindings,
  onClose,
}: RetrievalDebugDrawerProps) {
  const [form, setForm] = useState<RetrievalDebugFormState>(defaultFormState);
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
    if (!form.query.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await debugRetrieve(buildRetrieveRequest(appId, form));
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
        className="fixed inset-0 z-40 bg-slate-950/25"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-5xl border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Retrieval Debug
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {appName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Run the retrieval pipeline directly and inspect datasets, hits,
                sources, trace, and the assembled context.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="border-r border-slate-200 bg-slate-50/70 px-5 py-5">
              <div className="space-y-4">
                <label className="block">
                  <div className="text-sm font-medium text-slate-700">
                    Query
                  </div>
                  <textarea
                    className="mt-2 h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
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
                  <div className="text-sm font-medium text-slate-700">
                    Retrieval Mode
                  </div>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
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
                    <div className="text-sm font-medium text-slate-700">
                      Top K
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
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
                    <div className="text-sm font-medium text-slate-700">
                      Threshold
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step="0.01"
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
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

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        Datasets
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Use all
                      </button>
                    )}
                  </div>
                  {bindings.length === 0 ? (
                    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                      No dataset is currently bound to this app.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {bindings.map((binding) => (
                        <label
                          key={binding.id}
                          className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-3"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                            checked={form.datasetIds.includes(
                              binding.datasetId
                            )}
                            onChange={() => toggleDataset(binding.datasetId)}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-700">
                              {binding.dataset.name}
                            </div>
                            <div className="mt-1 truncate font-mono text-[11px] text-slate-400">
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
                  className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Running..." : "Run Retrieval Debug"}
                </button>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-5">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {result ? (
                <RetrievalResultView result={result} />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
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
