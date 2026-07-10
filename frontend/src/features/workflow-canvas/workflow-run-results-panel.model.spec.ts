import assert from "node:assert/strict";
import test from "node:test";
import { createWorkflowRunResultsPanelViewModel } from "./workflow-run-results-panel.model";

test("run results panel stays hidden when there is no console output or node result", () => {
  assert.deepStrictEqual(
    createWorkflowRunResultsPanelViewModel({
      output: "",
      nodeResultCount: 0,
      isCollapsed: false,
    }),
    {
      hasContent: false,
      showsBody: false,
      toggleLabel: "Collapse",
    }
  );
});

test("run results panel keeps header visible after collapsing so the user can reopen it", () => {
  assert.deepStrictEqual(
    createWorkflowRunResultsPanelViewModel({
      output: '{"answer":"hi"}',
      nodeResultCount: 0,
      isCollapsed: true,
    }),
    {
      hasContent: true,
      showsBody: false,
      toggleLabel: "Expand",
    }
  );
});

test("run results panel shows body when content exists and the panel is expanded", () => {
  assert.deepStrictEqual(
    createWorkflowRunResultsPanelViewModel({
      output: "",
      nodeResultCount: 2,
      isCollapsed: false,
    }),
    {
      hasContent: true,
      showsBody: true,
      toggleLabel: "Collapse",
    }
  );
});
