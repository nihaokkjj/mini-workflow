import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApps } from "../queries/apps/useApps";
import { useCreateApp } from "../queries/apps/useCreateApp";
import { useDeleteApp } from "../queries/apps/useDeleteApp";
import type { AppDto } from "../types";

export default function AppListPage() {
  const navigate = useNavigate();
  const { data: appsResp, isLoading, error } = useApps();
  const createApp = useCreateApp();
  const deleteApp = useDeleteApp();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    if (error) showToast(error.message || "Failed to load apps");
  }, [error]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const { data } = await createApp.mutateAsync({ name, mode: "workflow" });
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
    } catch {
      showToast("Failed to delete app");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mini Dify</h1>
          <p className="mt-2 text-sm text-slate-500">
            创建 App，进入工作流编辑器，或先查看项目内置操作说明。
          </p>
        </div>
        <button
          onClick={() => navigate("/guide")}
          className="shrink-0 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
        >
          使用说明
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        <input
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="App name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          Create App
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse"
            >
              <div className="h-4 w-2/3 bg-slate-200 rounded mb-3" />
              <div className="h-3 w-1/3 bg-slate-100 rounded mb-8" />
              <div className="flex gap-2">
                <div className="h-8 flex-1 bg-slate-100 rounded-lg" />
                <div className="h-8 flex-1 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(appsResp?.data ?? []).map((app) => (
            <div
              key={app.id}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-slate-800">{app.name}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full">
                      {app.mode}
                    </span>
                    {" · "}
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {app.description && (
                <div className="text-sm text-slate-500 mb-4 line-clamp-2">
                  {app.description}
                </div>
              )}
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => navigate(`/app/${app.id}`)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => navigate(`/app/${app.id}/chat`)}
                  className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                >
                  Chat
                </button>
                <button
                  onClick={() => setToDelete(app.id)}
                  className="px-3 py-1.5 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (appsResp?.data ?? []).length === 0 && (
        <div className="text-center text-slate-400 py-12">
          No apps yet. Create one above.
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <div className="font-semibold mb-2">Delete app?</div>
            <p className="text-sm text-slate-500 mb-4">
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setToDelete(null)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
