import { useMemo, useState } from "react";
import { useDatasets } from "../../queries/datasets/useDatasets";
import { useBindAppDataset } from "../../queries/datasets/useBindAppDataset";
import { useUnbindAppDataset } from "../../queries/datasets/useUnbindAppDataset";
import type { AppDatasetBindingDto } from "../../types";

interface AppDatasetBindingsDrawerProps {
  appId: string;
  appName: string;
  bindings: AppDatasetBindingDto[];
  onClose: () => void;
}

export function AppDatasetBindingsDrawer({
  appId,
  appName,
  bindings,
  onClose,
}: AppDatasetBindingsDrawerProps) {
  const { data: datasets = [], isLoading: loading } = useDatasets();
  const bindMutation = useBindAppDataset(appId);
  const unbindMutation = useUnbindAppDataset(appId);
  const [busyDatasetId, setBusyDatasetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bindingByDatasetId = useMemo(
    () => new Map(bindings.map((binding) => [binding.datasetId, binding])),
    [bindings]
  );

  const handleToggleBinding = async (datasetId: string) => {
    setBusyDatasetId(datasetId);
    setError(null);

    try {
      if (bindingByDatasetId.has(datasetId)) {
        await unbindMutation.mutateAsync(datasetId);
      } else {
        await bindMutation.mutateAsync(datasetId);
      }
    } catch {
      setError("Failed to update app datasets");
    } finally {
      setBusyDatasetId(null);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close dataset bindings"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-violet-200 bg-white">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-violet-200 px-5 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.8px] text-[#7b6b9d]">
                App Datasets
              </div>
              <h2 className="mt-1 text-lg font-semibold text-[#2f2147]">
                {appName}
              </h2>
              <p className="mt-1 text-sm text-[#5e4b85]">
                Bind datasets here, then pick them in the knowledge retrieval
                node.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[#8b7aa9] transition hover:bg-violet-50 hover:text-[#4b377f]"
            >
              ✕
            </button>
          </div>

          <div className="border-b border-violet-200 bg-violet-50/70 px-5 py-4">
            <div className="text-sm font-medium text-[#4b377f]">
              Currently bound
            </div>
            {bindings.length === 0 ? (
              <p className="mt-2 text-sm text-[#7b6b9d]">
                No dataset is bound to this app yet.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {bindings.map((binding) => (
                  <span
                    key={binding.id}
                    className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                  >
                    {binding.dataset.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-3 text-sm text-[#7b6b9d]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-accent" />
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.06] px-4 py-5 text-sm text-white/45">
                No dataset has been created yet. Create one through the RAG API
                first, then bind it to this app here.
              </div>
            ) : (
              <div className="space-y-3">
                {datasets.map((dataset) => {
                  const isBound = bindingByDatasetId.has(dataset.id);
                  const isBusy = busyDatasetId === dataset.id;

                  return (
                    <div
                      key={dataset.id}
                      className={`rounded-xl border px-4 py-4 transition ${
                        isBound
                          ? "border-accent/30 bg-accent/[0.04]"
                          : "border-white/12 bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-[#2f2147]">
                              {dataset.name}
                            </h3>
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#6b46c1]">
                              {dataset.retrievalMode}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#7b6b9d]">
                            {dataset.description?.trim() || "No description"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#7b6b9d]">
                            <span className="rounded-full bg-violet-50 px-2 py-1">
                              Status: {dataset.status}
                            </span>
                            <span className="rounded-full bg-violet-50 px-2 py-1">
                              Top K: {dataset.topK}
                            </span>
                            <span className="rounded-full bg-violet-50 px-2 py-1">
                              Threshold: {dataset.scoreThreshold}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleBinding(dataset.id)}
                          className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
                            isBound
                              ? "bg-violet-50 text-[#5e4b85] ring-1 ring-violet-200 hover:bg-violet-100 hover:text-[#2f2147]"
                              : "bg-accent text-white hover:brightness-110"
                          }`}
                        >
                          {isBusy ? "Saving..." : isBound ? "Unbind" : "Bind"}
                        </button>
                      </div>
                      <div className="mt-3 truncate font-mono text-[11px] text-[#b2a6cc]">
                        {dataset.id}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
