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
      <div className="flex h-12 items-center gap-4 border-b border-white/8 bg-canvas px-4">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Back
        </button>
        <span className="font-semibold text-white">
          {app?.name ?? "Loading..."}
        </span>
        <button
          type="button"
          onClick={() => setIsRetrievalDebugOpen(true)}
          className="ml-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white"
        >
          Retrieval Debug
        </button>
        <button
          type="button"
          onClick={() => setIsDatasetDrawerOpen(true)}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/60 transition hover:border-white/20 hover:text-white"
        >
          Datasets
          <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40">
            {appDatasets.length}
          </span>
        </button>
      </div>

      <div className="flex-1">
        {workflowLoading ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm text-white/40">
            <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
            Loading workflow...
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
