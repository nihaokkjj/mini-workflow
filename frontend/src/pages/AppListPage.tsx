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
    if (error) showToast(error.message || "应用加载失败");
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
      showToast("应用创建失败");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteApp.mutateAsync(toDelete);
      setToDelete(null);
      showToast("应用已删除", "success");
    } catch {
      showToast("应用删除失败");
    }
  };

  const apps = Array.isArray(appsResp) ? appsResp : [];

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 py-8 sm:px-10">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#2f2147]">
            Agent<span className="text-accent">Forge</span>
          </h1>
          <p className="mt-2 text-sm text-[#5e4b85]">
            创建应用后，在画布上编排它的工作流。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/datasets")}
            className="shrink-0 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-[#4b377f] backdrop-blur transition hover:border-violet-300 hover:bg-white"
          >
            知识库
          </button>
          <button
            onClick={() => navigate("/guide")}
            className="shrink-0 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-medium text-[#4b377f] backdrop-blur transition hover:border-violet-300 hover:bg-white"
          >
            使用说明
          </button>
        </div>
      </header>

      {/* Create bar */}
      <div className="mt-8 flex gap-3">
        <input
          className="flex-1 rounded-xl border border-violet-200 bg-white/90 px-4 py-3 text-sm text-[#2f2147] placeholder:text-[#8b7aa9] transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          placeholder="应用名称..."
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
          {createApp.isPending ? "创建中..." : "创建应用"}
        </button>
      </div>

      {/* Section label */}
      <div className="mt-10 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.8px] text-[#7b6b9d]">
          我的应用
        </h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-violet-200/80 bg-white/80 p-5 backdrop-blur-2xl"
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
              className="flex flex-col rounded-2xl border border-violet-200/80 bg-white/78 p-5 backdrop-blur-2xl transition hover:border-violet-300 hover:bg-white/92"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-[#2f2147]">{app.name}</div>
                  <div className="mt-1 text-xs text-[#7b6b9d]">
                    <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-[#6b46c1]">
                      {app.mode}
                    </span>
                    <span className="mx-1.5 text-[#b2a6cc]">&middot;</span>
                    {new Date(app.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {app.description && (
                <p className="mt-3 line-clamp-2 text-sm text-[#5e4b85]">
                  {app.description}
                </p>
              )}
              <div className="mt-auto flex gap-2 pt-4">
                <button
                  onClick={() => navigate(`/app/${app.id}`)}
                  className="flex-1 rounded-lg border border-violet-200 bg-white/85 px-3 py-2 text-sm font-medium text-[#4b377f] transition hover:border-violet-300 hover:bg-white"
                >
                  编辑
                </button>
                <button
                  onClick={() => navigate(`/app/${app.id}/chat`)}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition"
                  style={{
                    background:
                      "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
                  }}
                >
                  聊天
                </button>
                <button
                  onClick={() => setToDelete(app.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm font-medium text-red-400 transition hover:border-red-500/40 hover:bg-red-500/10"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && apps.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20">
          <p className="text-sm text-[#7b6b9d]">
            还没有应用。先创建一个应用开始使用。
          </p>
        </div>
      )}

      {/* Delete confirm dialog */}
      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-violet-200 bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-[#2f2147]">
              删除这个应用？
            </h3>
            <p className="mt-1 text-sm text-[#5e4b85]">此操作不可撤销。</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setToDelete(null)}
                className="rounded-lg border border-violet-200 bg-white/90 px-4 py-2 text-sm font-medium text-[#4b377f] transition hover:border-violet-300 hover:bg-white"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-violet-200 bg-white/95 px-4 py-3 text-sm text-[#2f2147] shadow-xl backdrop-blur-2xl"
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
