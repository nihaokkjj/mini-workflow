import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../queries/apps/useApp";
import { useWorkflow } from "../queries/workflows/useWorkflow";
import { useAppDatasets } from "../queries/datasets/useAppDatasets";
import { AppDatasetBindingsDrawer } from "../features/app-datasets/AppDatasetBindingsDrawer";
import { RetrievalDebugDrawer } from "../features/retrieval-debug/RetrievalDebugDrawer";
import { WorkflowCanvas } from "../features/workflow-canvas/WorkflowCanvas";

export default function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { data: app, error: appError } = useApp(appId);
  const { data: workflow, isLoading: workflowLoading } = useWorkflow(appId);
  const { data: appDatasets = [] } = useAppDatasets(appId);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [isRetrievalDebugOpen, setIsRetrievalDebugOpen] = useState(false);

  useEffect(() => {
    if (appError) navigate("/");
  }, [appError, navigate]);

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-12 items-center gap-4 border-b border-violet-200/80 bg-white/70 px-4 backdrop-blur">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-[#6b5a8b] transition hover:text-[#2f2147]"
        >
          ← 返回
        </button>
        <span className="font-semibold text-[#2f2147]">
          {app?.name ?? "加载中..."}
        </span>
        <button
          type="button"
          onClick={() => setIsRetrievalDebugOpen(true)}
          className="ml-auto rounded-md border border-violet-200 bg-white/85 px-3 py-1.5 text-sm font-medium text-[#5e4b85] transition hover:border-violet-300 hover:bg-white hover:text-[#2f2147]"
        >
          检索调试
        </button>
        <button
          type="button"
          onClick={() => setIsDatasetDrawerOpen(true)}
          className="rounded-md border border-violet-200 bg-white/85 px-3 py-1.5 text-sm font-medium text-[#5e4b85] transition hover:border-violet-300 hover:bg-white hover:text-[#2f2147]"
        >
          知识库
          <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-[#7b6b9d]">
            {appDatasets.length}
          </span>
        </button>
      </div>

      <div className="flex-1">
        {workflowLoading ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm text-[#7b6b9d]">
            <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
            工作流加载中...
          </div>
        ) : (
          <WorkflowCanvas
            appId={appId!}
            workflowId={workflow?.id ?? null}
            initialGraph={workflow?.graph ?? null}
            appDatasets={appDatasets}
          />
        )}
      </div>

      {isDatasetDrawerOpen && appId && app && (
        <AppDatasetBindingsDrawer
          appId={appId}
          appName={app.name}
          bindings={appDatasets}
          onClose={() => setIsDatasetDrawerOpen(false)}
        />
      )}
      {isRetrievalDebugOpen && appId && app && (
        <RetrievalDebugDrawer
          appId={appId}
          appName={app.name}
          bindings={appDatasets}
          onClose={() => setIsRetrievalDebugOpen(false)}
        />
      )}
    </div>
  );
}
