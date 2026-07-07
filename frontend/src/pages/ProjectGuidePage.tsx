import { useNavigate } from "react-router-dom";
import { OperationGuideArticle } from "../components/OperationGuideArticle";
import { projectOperationGuide } from "../content/projectOperationGuide";

export default function ProjectGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 backdrop-blur transition hover:border-white/20 hover:text-white"
          >
            ← Back
          </button>
          <div className="text-xs font-semibold uppercase tracking-[0.8px] text-white/30">
            AgentForge Guide
          </div>
        </div>

        <OperationGuideArticle document={projectOperationGuide} />
      </div>
    </div>
  );
}
