export interface WorkflowRunResultsPanelViewModel {
  hasContent: boolean;
  showsBody: boolean;
  toggleLabel: "Collapse" | "Expand";
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
    toggleLabel: isCollapsed ? "Expand" : "Collapse",
  };
}
