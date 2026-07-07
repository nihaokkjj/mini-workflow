import { useEffect, useState } from "react";
import { getCollapsibleTextState } from "../workflow-canvas/workflow-runtime.model";

interface CollapsibleTextBlockProps {
  text: string;
  maxPreviewLength?: number;
}

export function CollapsibleTextBlock({
  text,
  maxPreviewLength = 240,
}: CollapsibleTextBlockProps) {
  const collapseState = getCollapsibleTextState(text, maxPreviewLength);
  const [expanded, setExpanded] = useState(!collapseState.isCollapsedByDefault);

  useEffect(() => {
    setExpanded(!collapseState.isCollapsedByDefault);
  }, [text, collapseState.isCollapsedByDefault]);

  return (
    <div className="rounded-xl border border-white/8 bg-black/20">
      <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="text-sm font-medium text-white/70">Context</div>
        {collapseState.isCollapsedByDefault && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-xs font-medium text-accent transition hover:text-accent-2"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        )}
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 py-3 text-xs text-white/60">
        {expanded ? text : collapseState.preview}
      </pre>
    </div>
  );
}
