export interface WorkflowRunResultsPanelViewModel {
  hasContent: boolean;
  showsBody: boolean;
  toggleLabel: "收起" | "展开";
}

export function createWorkflowRunResultsPanelViewModel({
  output,
  nodeResultCount,
  isCollapsed,
}: {
  output: string;
  nodeResultCount: number;
  isCollapsed: boolean;
}): WorkflowRunResultsPanelViewModel {
  const hasContent = Boolean(output) || nodeResultCount > 0;

  return {
    hasContent,
    showsBody: hasContent && !isCollapsed,
    toggleLabel: isCollapsed ? "展开" : "收起",
  };
}
