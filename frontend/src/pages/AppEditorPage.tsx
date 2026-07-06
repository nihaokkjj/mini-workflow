import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listAppDatasets } from "../services/api";
import { useApp } from "../queries/apps/useApp";
import { useWorkflow } from "../queries/workflows/useWorkflow";
import { AppDatasetBindingsDrawer } from "../features/app-datasets/AppDatasetBindingsDrawer";
import { RetrievalDebugDrawer } from "../features/retrieval-debug/RetrievalDebugDrawer";
import { WorkflowCanvas } from "../features/workflow-canvas/WorkflowCanvas";
import { useWorkflowStore } from "../stores/workflow.store";

export default function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { data: app, error: appError } = useApp(appId);
  const { data: workflow, isLoading: workflowLoading } = useWorkflow(appId);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [isRetrievalDebugOpen, setIsRetrievalDebugOpen] = useState(false);
  const setWorkflowApp = useWorkflowStore((s) => s.setApp);
  const appDatasets = useWorkflowStore((s) => s.appDatasets);
  const setAppDatasets = useWorkflowStore((s) => s.setAppDatasets);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);

  // Navigate away on app fetch error
  useEffect(() => {
    if (appError) navigate("/");
  }, [appError, navigate]);

  // Sync workflow data into the workflow store (canvas state migrates in Task 10)
  useEffect(() => {
    if (!appId) {
      setWorkflowApp("", "");
      loadGraph([], []);
      return;
    }

    if (!workflow) {
      // null means no workflow exists yet — start empty
      setWorkflowApp(appId, "");
      loadGraph([], []);
      return;
    }

    setWorkflowApp(appId, workflow.id);
    loadGraph(workflow.graph.nodes, workflow.graph.edges);
  }, [appId, workflow, setWorkflowApp, loadGraph]);

  // Fetch app dataset bindings (will be migrated to a query hook in Task 13)
  useEffect(() => {
    setAppDatasets([]);

    if (!appId) {
      return;
    }

    listAppDatasets(appId)
      .then(({ data }) => {
        setAppDatasets(data);
      })
      .catch(() => {
        setAppDatasets([]);
      });
  }, [appId, setAppDatasets]);

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
        <button
          onClick={() => navigate("/")}
          className="text-slate-500 hover:text-slate-800 text-sm"
        >
          ← Back
        </button>
        <span className="font-semibold text-slate-700">
          {app?.name ?? "Loading..."}
        </span>
        <button
          type="button"
          onClick={() => setIsRetrievalDebugOpen(true)}
          className="ml-auto rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Retrieval Debug
        </button>
        <button
          type="button"
          onClick={() => setIsDatasetDrawerOpen(true)}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Datasets
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {appDatasets.length}
          </span>
        </button>
      </div>
      <div className="flex-1">
        {workflowLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            <div className="h-5 w-5 mr-3 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
            Loading workflow...
          </div>
        ) : (
          <WorkflowCanvas />
        )}
      </div>
      {isDatasetDrawerOpen && appId && app && (
        <AppDatasetBindingsDrawer
          appId={appId}
          appName={app.name}
          bindings={appDatasets}
          onBindingsChange={setAppDatasets}
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
