import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getApp, getWorkflowByApp, listAppDatasets } from "../services/api";
import {
  nextAppDatasetRequestVersion,
  shouldApplyAppDatasetResponse,
} from "../features/app-datasets/app-dataset-sync.model";
import { AppDatasetBindingsDrawer } from "../features/app-datasets/AppDatasetBindingsDrawer";
import { RetrievalDebugDrawer } from "../features/retrieval-debug/RetrievalDebugDrawer";
import { WorkflowCanvas } from "../features/workflow-canvas/WorkflowCanvas";
import { useWorkflowStore } from "../stores/workflow.store";
import type { AppDto } from "../types";

export default function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppDto | null>(null);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [isRetrievalDebugOpen, setIsRetrievalDebugOpen] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const appDatasetRequestVersionRef = useRef(0);
  const setWorkflowApp = useWorkflowStore((s) => s.setApp);
  const appDatasets = useWorkflowStore((s) => s.appDatasets);
  const setAppDatasets = useWorkflowStore((s) => s.setAppDatasets);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);

  useEffect(() => {
    appDatasetRequestVersionRef.current = nextAppDatasetRequestVersion(
      appDatasetRequestVersionRef.current
    );
    const requestVersion = appDatasetRequestVersionRef.current;
    setApp(null);
    setWorkflowLoading(true);

    if (!appId) {
      setWorkflowApp("", "");
      loadGraph([], []);
      setWorkflowLoading(false);
      return;
    }

    getApp(appId)
      .then(({ data }) => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        setApp(data);
      })
      .catch(() => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        navigate("/");
      });

    getWorkflowByApp(appId)
      .then(({ data }) => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        if (!data) {
          setWorkflowApp(appId, "");
          loadGraph([], []);
          return;
        }
        setWorkflowApp(appId, data.id);
        loadGraph(data.graph.nodes, data.graph.edges);
      })
      .catch(() => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        // No workflow yet — start empty
        setWorkflowApp(appId, "");
        loadGraph([], []);
      })
      .finally(() => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        setWorkflowLoading(false);
      });
  }, [appId, navigate, setWorkflowApp, loadGraph]);

  useEffect(() => {
    const requestVersion = appDatasetRequestVersionRef.current;
    setIsDatasetDrawerOpen(false);
    setIsRetrievalDebugOpen(false);
    setAppDatasets([]);

    if (!appId) {
      return;
    }

    listAppDatasets(appId)
      .then(({ data }) => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

        setAppDatasets(data);
      })
      .catch(() => {
        if (
          !shouldApplyAppDatasetResponse(
            appDatasetRequestVersionRef.current,
            requestVersion
          )
        ) {
          return;
        }

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
