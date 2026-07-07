import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApps } from "../queries/apps/useApps";
import { useCreateApp } from "../queries/apps/useCreateApp";
import { useDeleteApp } from "../queries/apps/useDeleteApp";

export default function AppListPage() {
  const navigate = useNavigate();
  const { data: appsResp, isLoading, error } = useApps();
  const createApp = useCreateApp();
  const deleteApp = useDeleteApp();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    tone: "error" | "success";
  } | null>(null);

  const showToast = (text: string, tone: "error" | "success" = "error") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (error) showToast(error.message || "Failed to load apps");
  }, [error]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const { data } = await createApp.mutateAsync({
        name,
        mode: "workflow",
      });
      navigate(`/app/${data.id}`);
    } catch {
      showToast("Failed to create app");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteApp.mutateAsync(toDelete);
      setToDelete(null);
      showToast("App deleted", "success");
    } catch {
      showToast("Failed to delete app");
    }
  };

  const apps = appsResp?.data ?? [];

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8 sm:px-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Agent<span className="text-accent">Forge</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Create an app, then build its workflow on the canvas.
          </p>
        </div>
        <button
          onClick={() => navigate("/guide")}
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur transition hover:border-white/20 hover:text-white"
        >
          Guide
        </button>
      </header>

      {/* Create bar */}
      <div className="mt-8 flex gap-3">
        <input
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/25 transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          placeholder="App name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={createApp.isPending}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white transition"
          style={{
            background: "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
          }}
        >
          {createApp.isPending ? "Creating..." : "Create App"}
        </button>
      </div>

      {/* Section label */}
      <div className="mt-10 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.8px] text-white/40">
          Your Apps
        </h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-2xl"
            >
              <div className="mb-3 h-4 w-2/3 rounded bg-white/10" />
              <div className="mb-8 h-3 w-1/3 rounded bg-white/5" />
              <div className="flex gap-2">
                <div className="h-8 flex-1 rounded-lg bg-white/5" />
                <div className="h-8 flex-1 rounded-lg bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* App cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-5 backdrop-blur-2xl transition hover:border-white/15"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-white">{app.name}</div>
                  <div className="mt-1 text-xs text-white/40">
                    <span className="inline-block rounded-full bg-white/8 px-2 py-0.5 text-[11px]">
                      {app.mode}
                    </span>
                    <span className="mx-1.5 text-white/20">&middot;</span>
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {app.description && (
                <p className="mt-3 line-clamp-2 text-sm text-white/50">
                  {app.description}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <button
                  onClick={() => navigate(`/app/${app.id}`)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/app/${app.id}/chat`)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition"
                  style={{
                    background:
                      "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
                  }}
                >
                  Chat
                </button>
                <button
                  onClick={() => setToDelete(app.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && apps.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <p className="text-sm text-white/30">
            No apps yet. Create one above to get started.
          </p>
        </div>
      )}

      {/* Delete confirm dialog */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white">
              Delete this app?
            </h3>
            <p className="mt-1 text-sm text-white/50">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setToDelete(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-white/10 bg-[#1a1a2e] px-4 py-3 text-sm text-white shadow-xl backdrop-blur-2xl"
          role="status"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              toast.tone === "error" ? "bg-red-400" : "bg-green-400"
            }`}
          />
          {toast.text}
        </div>
      )}
    </div>
  );
}
