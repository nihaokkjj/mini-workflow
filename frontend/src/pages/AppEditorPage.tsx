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
  const store = useWorkflowStore();

  useEffect(() => {
    if (!appId) return;
    getApp(appId)
      .then(({ data }) => setApp(data))
      .catch(() => navigate("/"));

    getWorkflowByApp(appId)
      .then(({ data }) => {
        store.setApp(appId, data.id);
        store.loadGraph(data.graph.nodes, data.graph.edges);
      })
      .catch(() => {
        // No workflow yet — start empty
        store.setApp(appId, "");
      });
  }, [appId, navigate, store]);

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
        <WorkflowCanvas />
      </div>
    </div>
  );
}
