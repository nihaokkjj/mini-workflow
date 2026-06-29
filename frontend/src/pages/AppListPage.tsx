import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listApps, createApp, deleteApp } from "../services/api";
import type { AppDto } from "../types";

export default function AppListPage() {
  const [apps, setApps] = useState<AppDto[]>([]);
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await listApps();
      setApps(data);
    } catch { /* offline */ }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const { data } = await createApp(name);
      navigate(`/app/${data.id}/chat`);
    } catch { alert("Failed to create app"); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteApp(toDelete);
      setToDelete(null);
      load();
    } catch { alert("Failed to delete"); }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mini Dify</h1>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <div
            key={app.id}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-slate-800">{app.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full">{app.mode}</span>
                  {" · "}{new Date(app.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {app.description && (
              <div className="text-sm text-slate-500 mb-4 line-clamp-2">{app.description}</div>
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

      {apps.length === 0 && (
        <div className="text-center text-slate-400 py-12">No apps yet. Create one above.</div>
      )}

      {toDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <div className="font-semibold mb-2">Delete app?</div>
            <p className="text-sm text-slate-500 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setToDelete(null)} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={confirmDelete} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
