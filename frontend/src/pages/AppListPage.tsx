import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listApps, createApp, deleteApp } from "../services/api";
import type { AppDto } from "../types";

export default function AppListPage() {
  const [apps, setApps] = useState<AppDto[]>([]);
  const [name, setName] = useState("");
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
      navigate(`/app/${data.id}`);
    } catch { alert("Failed to create app"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApp(id);
      load();
    } catch { alert("Failed to delete"); }
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mini Dify</h1>

      <div className="flex gap-2 mb-6">
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

      <div className="grid gap-3">
        {apps.map((app) => (
          <div
            key={app.id}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between hover:shadow-sm cursor-pointer"
            onClick={() => navigate(`/app/${app.id}`)}
          >
            <div>
              <div className="font-semibold">{app.name}</div>
              <div className="text-xs text-slate-400">{app.mode} · {new Date(app.createdAt).toLocaleDateString()}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
        {apps.length === 0 && (
          <div className="text-center text-slate-400 py-8">No apps yet. Create one above.</div>
        )}
      </div>
    </div>
  );
}
