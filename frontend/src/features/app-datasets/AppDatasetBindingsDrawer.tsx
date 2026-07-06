import { useEffect, useMemo, useState } from "react";
import {
  bindAppDataset,
  listAppDatasets,
  listDatasets,
  unbindAppDataset,
} from "../../services/api";
import type { AppDatasetBindingDto, DatasetDto } from "../../types";

interface AppDatasetBindingsDrawerProps {
  appId: string;
  appName: string;
  bindings: AppDatasetBindingDto[];
  onBindingsChange: (bindings: AppDatasetBindingDto[]) => void;
  onClose: () => void;
}

export function AppDatasetBindingsDrawer({
  appId,
  appName,
  bindings,
  onBindingsChange,
  onClose,
}: AppDatasetBindingsDrawerProps) {
  const [datasets, setDatasets] = useState<DatasetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDatasetId, setBusyDatasetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listDatasets()
      .then(({ data }) => {
        if (!cancelled) {
          setDatasets(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to load datasets");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const bindingByDatasetId = useMemo(
    () => new Map(bindings.map((binding) => [binding.datasetId, binding])),
    [bindings]
  );

  const refreshBindings = async () => {
    const { data } = await listAppDatasets(appId);
    onBindingsChange(data);
  };

  const handleToggleBinding = async (datasetId: string) => {
    setBusyDatasetId(datasetId);
    setError(null);

    try {
      if (bindingByDatasetId.has(datasetId)) {
        await unbindAppDataset(appId, datasetId);
      } else {
        await bindAppDataset(appId, datasetId);
      }

      await refreshBindings();
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
        className="fixed inset-0 z-40 bg-slate-950/25"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                App Datasets
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                {appName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Bind datasets here, then pick them directly in the knowledge
                retrieval node.
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

          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="text-sm font-medium text-slate-700">
              Currently bound
            </div>
            {bindings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No dataset is bound to this app yet.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {bindings.map((binding) => (
                  <span
                    key={binding.id}
                    className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {binding.dataset.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {error && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
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
                          ? "border-blue-200 bg-blue-50/60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-slate-800">
                              {dataset.name}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              {dataset.retrievalMode}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {dataset.description?.trim() || "No description"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              Status: {dataset.status}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
                              Top K: {dataset.topK}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-1">
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
                              ? "bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {isBusy ? "Saving..." : isBound ? "Unbind" : "Bind"}
                        </button>
                      </div>
                      <div className="mt-3 truncate font-mono text-[11px] text-slate-400">
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
