import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getApp, getWorkflowByApp } from "../services/api";
import { WorkflowCanvas } from "../features/workflow-canvas/WorkflowCanvas";
import { useWorkflowStore } from "../stores/workflow.store";
import type { AppDto } from "../types";

export default function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppDto | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const setWorkflowApp = useWorkflowStore((s) => s.setApp);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);

  useEffect(() => {
    if (!appId) return;
    getApp(appId)
      .then(({ data }) => setApp(data))
      .catch(() => navigate("/"));

    getWorkflowByApp(appId)
      .then(({ data }) => {
        if (!data) {
          setWorkflowApp(appId, "");
          loadGraph([], []);
          return;
        }
        setWorkflowApp(appId, data.id);
        loadGraph(data.graph.nodes, data.graph.edges);
      })
      .catch(() => {
        // No workflow yet — start empty
        setWorkflowApp(appId, "");
        loadGraph([], []);
      })
      .finally(() => setWorkflowLoading(false));
  }, [appId, navigate, setWorkflowApp, loadGraph]);

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
    </div>
  );
}
