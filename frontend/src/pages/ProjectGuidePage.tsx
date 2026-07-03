import { useNavigate } from "react-router-dom";
import { OperationGuideArticle } from "../components/OperationGuideArticle";
import { projectOperationGuide } from "../content/projectOperationGuide";

export default function ProjectGuidePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)]">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
          >
            ← 返回首页
          </button>
          <div className="text-xs uppercase tracking-[0.26em] text-slate-400">
            Mini Dify Guide
          </div>
        </div>

        <OperationGuideArticle document={projectOperationGuide} />
      </div>
    </div>
  );
}
