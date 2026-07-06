# Frontend State Management Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor mini-dify frontend state management into a layered architecture: TanStack Query for server state, Zustand for runtime/UI state, and ReactFlow native state for the canvas.

**Architecture:** State is split by type: `queries/<domain>/` caches server data, `stores/run.store.ts` and `stores/canvas.store.ts` hold client state, and `features/workflow-canvas/canvas/useCanvasState.ts` and `features/workflow-canvas/run/useRunStream.ts` bridge ReactFlow and the execution lifecycle.

**Tech Stack:** React 19, Vite, TypeScript, Zustand 5, TanStack Query 5, @xyflow/react 12, node:test

## Global Constraints

- Run `pnpm run typecheck` before finishing each task group.
- Run `pnpm run test` before finishing each task group.
- Do not commit unrelated `frontend/vite.config.ts` changes.
- Prefer focused files; avoid growing files beyond ~300 lines.
- Add concise comments explaining non-obvious intent.
- Use sentence case for UI copy; active voice for actions.
- Respect `prefers-reduced-motion`.

---

## File Structure Map

New files are marked with `+`; modified files with `~`.

```
frontend/src/
├── lib/
│   └── query-client.ts                    +
├── queries/
│   ├── apps/
│   │   ├── keys.ts                        +
│   │   ├── useApps.ts                     +
│   │   ├── useApp.ts                      +
│   │   ├── useCreateApp.ts                +
│   │   └── useDeleteApp.ts                +
│   ├── workflows/
│   │   ├── keys.ts                        +
│   │   ├── useWorkflow.ts                 +
│   │   └── useSaveWorkflow.ts             +
│   ├── runs/
│   │   ├── keys.ts                        +
│   │   ├── useStartRun.ts                 +
│   │   └── useCancelRun.ts                +
│   ├── conversations/
│   │   ├── keys.ts                        +
│   │   ├── useConversations.ts            +
│   │   ├── useCreateConversation.ts       +
│   │   ├── useMessages.ts                 +
│   │   └── useDeleteConversation.ts       +
│   └── datasets/
│       ├── keys.ts                        +
│       ├── useDatasets.ts                 +
│       ├── useAppDatasets.ts              +
│       ├── useBindAppDataset.ts           +
│       ├── useUnbindAppDataset.ts         +
│       └── useDebugRetrieve.ts            +
├── services/
│   ├── api.ts                             ~  # keep REST, remove SSE
│   └── sse.ts                             +
├── stores/
│   ├── canvas.store.ts                    +
│   ├── run.store.ts                       +
│   ├── run.model.ts                       +
│   ├── run.store.spec.ts                  +
│   └── workflow.store.ts                  ~  # delete after migration
├── features/
│   ├── workflow-canvas/
│   │   ├── canvas/
│   │   │   ├── nodeTypes.ts               ~  # extracted from WorkflowCanvas
│   │   │   ├── useCanvasState.ts          +
│   │   │   └── useNodeIds.ts              +
│   │   ├── run/
│   │   │   ├── useRunStream.ts            +
│   │   │   └── run.model.ts               +
│   │   ├── WorkflowCanvas.tsx             ~  # use new hooks/stores
│   │   └── NodeConfigPanel.tsx            ~  # receive props instead of store
│   └── chat/
│       └── useChatStream.ts               +
├── pages/
│   ├── AppListPage.tsx                    ~  # use queries
│   ├── AppEditorPage.tsx                  ~  # use queries, pass props
│   └── ChatPage.tsx                       ~  # use queries + chat stream
└── main.tsx                               ~  # QueryClientProvider
```

---

## Task 1: Install TanStack Query and Provide QueryClient

**Files:**

- Modify: `frontend/package.json`
- Create: `frontend/src/lib/query-client.ts`
- Modify: `frontend/src/main.tsx`

**Interfaces:**

- Produces: `queryClient` singleton exported from `frontend/src/lib/query-client.ts`.

- [ ] **Step 1: Add dependency**

In `frontend/package.json`, add to `dependencies`:

```json
"@tanstack/react-query": "^5.0.0"
```

Run:

```bash
pnpm install
```

Expected: lockfile updated, `node_modules/@tanstack/react-query` exists.

- [ ] **Step 2: Create query client**

Create `frontend/src/lib/query-client.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
```

- [ ] **Step 3: Wrap app with QueryClientProvider**

Modify `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 4: Verify dev build**

Run:

```bash
pnpm --filter @mini-dify/frontend type-check
```

Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json pnpm-lock.yaml frontend/src/lib/query-client.ts frontend/src/main.tsx
git commit -m "chore: add @tanstack/react-query and QueryClientProvider"
```

---

## Task 2: Create `queries/apps/` and Migrate `AppListPage`

**Files:**

- Create: `frontend/src/queries/apps/keys.ts`
- Create: `frontend/src/queries/apps/useApps.ts`
- Create: `frontend/src/queries/apps/useApp.ts`
- Create: `frontend/src/queries/apps/useCreateApp.ts`
- Create: `frontend/src/queries/apps/useDeleteApp.ts`
- Modify: `frontend/src/pages/AppListPage.tsx`

**Interfaces:**

- Consumes: `listApps`, `createApp`, `deleteApp` from `services/api.ts`.
- Produces: `useApps()`, `useApp(id)`, `useCreateApp()`, `useDeleteApp()`.

- [ ] **Step 1: Write app query keys**

Create `frontend/src/queries/apps/keys.ts`:

```ts
export const appKeys = {
  all: ["apps"] as const,
  detail: (id: string) => [...appKeys.all, id] as const,
};
```

- [ ] **Step 2: Write app query hooks**

Create `frontend/src/queries/apps/useApps.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { listApps } from "../../services/api";
import { appKeys } from "./keys";

export function useApps() {
  return useQuery({ queryKey: appKeys.all, queryFn: listApps });
}
```

Create `frontend/src/queries/apps/useApp.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getApp } from "../../services/api";
import { appKeys } from "./keys";

export function useApp(id: string | undefined) {
  return useQuery({
    queryKey: appKeys.detail(id ?? ""),
    queryFn: () => getApp(id!),
    enabled: Boolean(id),
  });
}
```

Create `frontend/src/queries/apps/useCreateApp.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createApp } from "../../services/api";
import { appKeys } from "./keys";

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      mode,
    }: {
      name: string;
      mode?: "chat" | "workflow";
    }) => createApp(name, mode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appKeys.all }),
  });
}
```

Create `frontend/src/queries/apps/useDeleteApp.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteApp } from "../../services/api";
import { appKeys } from "./keys";

export function useDeleteApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteApp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appKeys.all }),
  });
}
```

- [ ] **Step 3: Migrate AppListPage**

Modify `frontend/src/pages/AppListPage.tsx` to use the new hooks. Remove `useEffect` + `load`, `useState<AppDto[]>`, `useState(isLoading)`. Keep local UI state for `name`, `toDelete`, `toast`.

```tsx
import { useNavigate } from "react-router-dom";
import { useApps } from "../queries/apps/useApps";
import { useCreateApp } from "../queries/apps/useCreateApp";
import { useDeleteApp } from "../queries/apps/useDeleteApp";
import type { AppDto } from "../types";

export default function AppListPage() {
  const navigate = useNavigate();
  const { data: apps, isLoading, error } = useApps();
  const createApp = useCreateApp();
  const deleteApp = useDeleteApp();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    if (error) showToast(error.message || "Failed to load apps");
  }, [error]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const { data } = await createApp.mutateAsync({ name, mode: "workflow" });
      navigate(`/app/${data.id}`);
    } catch {
      showToast("Failed to create app");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteApp.mutateAsync(toDelete);
      setToDelete(null);
    } catch {
      showToast("Failed to delete app");
    }
  };

  // ... JSX unchanged, replace `apps` with `apps ?? []` and `isLoading` with query loading
}
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/queries frontend/src/pages/AppListPage.tsx
git commit -m "refactor: add app queries and migrate AppListPage"
```

---

## Task 3: Create `queries/workflows/` and Migrate `AppEditorPage`

**Files:**

- Create: `frontend/src/queries/workflows/keys.ts`
- Create: `frontend/src/queries/workflows/useWorkflow.ts`
- Create: `frontend/src/queries/workflows/useSaveWorkflow.ts`
- Modify: `frontend/src/pages/AppEditorPage.tsx`

**Interfaces:**

- Consumes: `getWorkflowByApp`, `saveWorkflow` from `services/api.ts`.
- Produces: `useWorkflow(appId)`, `useSaveWorkflow()`.

- [ ] **Step 1: Write workflow query keys and hooks**

Create `frontend/src/queries/workflows/keys.ts`:

```ts
export const workflowKeys = {
  byApp: (appId: string) => ["workflows", "by-app", appId] as const,
};
```

Create `frontend/src/queries/workflows/useWorkflow.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getWorkflowByApp } from "../../services/api";
import { workflowKeys } from "./keys";

export function useWorkflow(appId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.byApp(appId ?? ""),
    queryFn: () => getWorkflowByApp(appId!),
    enabled: Boolean(appId),
  });
}
```

Create `frontend/src/queries/workflows/useSaveWorkflow.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { saveWorkflow } from "../../services/api";
import type { Graph } from "../../types";

export function useSaveWorkflow() {
  return useMutation({
    mutationFn: ({ appId, graph }: { appId: string; graph: Graph }) =>
      saveWorkflow(appId, graph),
  });
}
```

- [ ] **Step 2: Migrate AppEditorPage data fetching**

Replace manual `getApp` call with `useApp(appId)`. Replace manual `getWorkflowByApp` with `useWorkflow(appId)`. Keep drawer open state local. Do not wire canvas state yet; that happens in Task 10.

```tsx
import { useParams, useNavigate } from "react-router-dom";
import { useApp } from "../queries/apps/useApp";
import { useWorkflow } from "../queries/workflows/useWorkflow";
import { useWorkflowStore } from "../stores/workflow.store";
import { AppDatasetBindingsDrawer } from "../features/app-datasets/AppDatasetBindingsDrawer";
import { RetrievalDebugDrawer } from "../features/retrieval-debug/RetrievalDebugDrawer";
import { WorkflowCanvas } from "../features/workflow-canvas/WorkflowCanvas";

export default function AppEditorPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { data: app, error: appError } = useApp(appId);
  const { data: workflow, isLoading: workflowLoading } = useWorkflow(appId);
  const [isDatasetDrawerOpen, setIsDatasetDrawerOpen] = useState(false);
  const [isRetrievalDebugOpen, setIsRetrievalDebugOpen] = useState(false);
  const appDatasets = useWorkflowStore((s) => s.appDatasets);

  useEffect(() => {
    if (appError) navigate("/");
  }, [appError, navigate]);

  // Keep existing JSX but pass appId/workflowId explicitly to WorkflowCanvas later
}
```

- [ ] **Step 3: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/queries/workflows frontend/src/pages/AppEditorPage.tsx
git commit -m "refactor: add workflow queries and migrate AppEditorPage"
```

---

## Task 4: Extract Generic SSE Client

**Files:**

- Create: `frontend/src/services/sse.ts`
- Modify: `frontend/src/services/api.ts`

**Interfaces:**

- Produces: `subscribeToJsonStream<T>(url, handlers)` returning `AbortController`.

- [ ] **Step 1: Write SSE client**

Create `frontend/src/services/sse.ts`:

```ts
export interface SseHandlers<T> {
  onEvent: (event: T) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}

export function subscribeToJsonStream<T>(
  url: string,
  { onEvent, onDone, onError, signal }: SseHandlers<T>
): AbortController {
  const controller = new AbortController();

  fetch(url, { signal: signal ?? controller.signal })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        onError(`HTTP ${response.status}`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: T = JSON.parse(line.slice(6));
              onEvent(event);
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if ((err as Error).name !== "AbortError") {
        onError((err as Error).message);
      }
    });

  return controller;
}
```

- [ ] **Step 2: Simplify api.ts SSE helpers**

Modify `frontend/src/services/api.ts`:

- Import `subscribeToJsonStream` from `./sse`.
- Replace the inline SSE loops in `subscribeToRunStream` and `startChatRun` with calls to `subscribeToJsonStream`.
- Keep the public function signatures unchanged so callers are not broken.

Example for `subscribeToRunStream`:

```ts
import { subscribeToJsonStream } from "./sse";

export function subscribeToRunStream(
  runId: string,
  onEvent: (event: GraphEngineEvent) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  return subscribeToJsonStream<GraphEngineEvent>(
    `${API_BASE_URL}/runs/${runId}/stream`,
    { onEvent, onDone, onError }
  );
}
```

Do the same for `startChatRun`.

- [ ] **Step 3: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/sse.ts frontend/src/services/api.ts
git commit -m "refactor: extract generic SSE client"
```

---

## Task 5: Create `stores/run.store.ts` and Pure Model

**Files:**

- Create: `frontend/src/stores/run.model.ts`
- Create: `frontend/src/stores/run.model.spec.ts`
- Create: `frontend/src/stores/run.store.ts`

**Interfaces:**

- Produces: `RunState`, `createRunStateReducer()`, `useRunStore`.

- [ ] **Step 1: Write pure run state model**

Create `frontend/src/stores/run.model.ts`:

```ts
import type { GraphEngineEvent } from "../types";

export interface RunState {
  isRunning: boolean;
  currentRunId: string | null;
  executingNodeId: string | null;
  events: GraphEngineEvent[];
  outputs: Record<string, unknown> | null;
  error: string | null;
}

export const initialRunState: RunState = {
  isRunning: false,
  currentRunId: null,
  executingNodeId: null,
  events: [],
  outputs: null,
  error: null,
};

export type RunAction =
  | { type: "start"; runId: string }
  | { type: "event"; event: GraphEngineEvent }
  | { type: "setExecutingNode"; nodeId: string | null }
  | { type: "setOutputs"; outputs: Record<string, unknown> }
  | { type: "setError"; message: string }
  | { type: "finish" }
  | { type: "cancel" }
  | { type: "reset" };

export function runReducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "start":
      return {
        ...initialRunState,
        isRunning: true,
        currentRunId: action.runId,
      };
    case "event":
      return { ...state, events: [...state.events, action.event] };
    case "setExecutingNode":
      return { ...state, executingNodeId: action.nodeId };
    case "setOutputs":
      return { ...state, outputs: action.outputs };
    case "setError":
      return { ...state, isRunning: false, error: action.message };
    case "finish":
      return { ...state, isRunning: false, executingNodeId: null };
    case "cancel":
      return { ...state, isRunning: false, executingNodeId: null };
    case "reset":
      return initialRunState;
    default:
      return state;
  }
}
```

- [ ] **Step 2: Write model tests**

Create `frontend/src/stores/run.model.spec.ts`:

```ts
import assert from "node:assert";
import { test } from "node:test";
import { initialRunState, runReducer } from "./run.model";

test("start action resets state and sets run id", () => {
  const next = runReducer(
    { ...initialRunState, error: "old" },
    { type: "start", runId: "run-1" }
  );
  assert.strictEqual(next.isRunning, true);
  assert.strictEqual(next.currentRunId, "run-1");
  assert.strictEqual(next.error, null);
});

test("event appends to events", () => {
  const event = {
    event: "node_start" as const,
    nodeId: "n1",
    nodeType: "llm" as const,
    timestamp: 1,
  };
  const next = runReducer(initialRunState, { type: "event", event });
  assert.strictEqual(next.events.length, 1);
  assert.strictEqual(next.events[0].nodeId, "n1");
});

test("finish clears running state", () => {
  const running = runReducer(initialRunState, { type: "start", runId: "r" });
  const next = runReducer(running, { type: "finish" });
  assert.strictEqual(next.isRunning, false);
  assert.strictEqual(next.executingNodeId, null);
});
```

Run tests:

```bash
pnpm run test
```

Expected: new tests pass.

- [ ] **Step 3: Create Zustand store**

Create `frontend/src/stores/run.store.ts`:

```ts
import { create } from "zustand";
import type { GraphEngineEvent } from "../types";
import { initialRunState, runReducer, type RunState } from "./run.model";

interface RunStore extends RunState {
  startRun: (runId: string) => void;
  addEvent: (e: GraphEngineEvent) => void;
  setExecutingNode: (id: string | null) => void;
  setOutputs: (o: Record<string, unknown>) => void;
  setError: (msg: string) => void;
  finishRun: () => void;
  cancelRun: () => void;
  resetRun: () => void;
}

export const useRunStore = create<RunStore>((set) => ({
  ...initialRunState,
  startRun: (runId) => set((s) => runReducer(s, { type: "start", runId })),
  addEvent: (e) => set((s) => runReducer(s, { type: "event", event: e })),
  setExecutingNode: (id) =>
    set((s) => runReducer(s, { type: "setExecutingNode", nodeId: id })),
  setOutputs: (o) =>
    set((s) => runReducer(s, { type: "setOutputs", outputs: o })),
  setError: (msg) =>
    set((s) => runReducer(s, { type: "setError", message: msg })),
  finishRun: () => set((s) => runReducer(s, { type: "finish" })),
  cancelRun: () => set((s) => runReducer(s, { type: "cancel" })),
  resetRun: () => set((s) => runReducer(s, { type: "reset" })),
}));
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/run.model.ts frontend/src/stores/run.model.spec.ts frontend/src/stores/run.store.ts
git commit -m "feat: add run store and reducer model"
```

---

## Task 6: Create `queries/runs/` and `useRunStream`

**Files:**

- Create: `frontend/src/queries/runs/keys.ts`
- Create: `frontend/src/queries/runs/useStartRun.ts`
- Create: `frontend/src/queries/runs/useCancelRun.ts`
- Create: `frontend/src/features/workflow-canvas/run/useRunStream.ts`

**Interfaces:**

- Consumes: `startRun`, `cancelRun` from `services/api.ts`, `subscribeToJsonStream` from `services/sse.ts`, `useRunStore`.
- Produces: `useRunStream()` returning `{ runWorkflow, stopRun }`.

- [ ] **Step 1: Create run mutations**

Create `frontend/src/queries/runs/keys.ts`:

```ts
export const runKeys = {
  detail: (runId: string) => ["runs", runId] as const,
};
```

Create `frontend/src/queries/runs/useStartRun.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { startRun } from "../../services/api";

export function useStartRun() {
  return useMutation({
    mutationFn: ({
      workflowId,
      inputs,
    }: {
      workflowId: string;
      inputs: Record<string, unknown>;
    }) => startRun(workflowId, inputs),
  });
}
```

Create `frontend/src/queries/runs/useCancelRun.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { cancelRun } from "../../services/api";

export function useCancelRun() {
  return useMutation({ mutationFn: cancelRun });
}
```

- [ ] **Step 2: Write useRunStream hook**

Create `frontend/src/features/workflow-canvas/run/useRunStream.ts`:

```ts
import { useRef } from "react";
import { useRunStore } from "../../../stores/run.store";
import { useStartRun } from "../../../queries/runs/useStartRun";
import { useCancelRun } from "../../../queries/runs/useCancelRun";
import { subscribeToJsonStream } from "../../../services/sse";
import { API_BASE_URL } from "../../../services/api";
import type { GraphEngineEvent } from "../../../types";

export function useRunStream() {
  const store = useRunStore();
  const startMutation = useStartRun();
  const cancelMutation = useCancelRun();
  const abortRef = useRef<AbortController | null>(null);

  const runWorkflow = async (
    workflowId: string,
    inputs: Record<string, unknown>
  ) => {
    store.resetRun();
    const { data } = await startMutation.mutateAsync({ workflowId, inputs });
    store.startRun(data.runId);

    abortRef.current = subscribeToJsonStream<GraphEngineEvent>(
      `${API_BASE_URL}/runs/${data.runId}/stream`,
      {
        onEvent: (event) => {
          store.addEvent(event);
          if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (
            event.event === "node_end" ||
            event.event === "node_skipped"
          ) {
            store.setExecutingNode(null);
          } else if (event.event === "graph_end") {
            store.setOutputs(event.outputs);
          }
        },
        onDone: () => store.finishRun(),
        onError: (err) => store.setError(err),
      }
    );
  };

  const stopRun = async (runId?: string) => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.cancelRun();
    if (runId) {
      await cancelMutation.mutateAsync(runId);
    }
  };

  return { runWorkflow, stopRun };
}
```

Note: `API_BASE_URL` must be exported from `services/api.ts` if not already.

- [ ] **Step 3: Export API_BASE_URL**

If not already exported, change in `frontend/src/services/api.ts`:

```ts
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001/api"
).replace(/\/$/, "");
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/queries/runs frontend/src/features/workflow-canvas/run/useRunStream.ts frontend/src/services/api.ts
git commit -m "feat: add run queries and useRunStream hook"
```

---

## Task 7: Refactor `WorkflowCanvas` Runtime State

**Files:**

- Modify: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`

**Interfaces:**

- Consumes: `useRunStore`, `useRunStream`.
- Produces: `WorkflowCanvas` no longer holds run state locally.

- [ ] **Step 1: Replace local run state with store**

Remove from `WorkflowCanvasInner`:

- `const [output, setOutput] = useState("");`
- `const [currentRunId, setCurrentRunId] = useState<string | null>(null);`
- `const streamControllerRef = useRef<AbortController | null>(null);`

Add:

```tsx
import { useRunStore } from "../../stores/run.store";
import { useRunStream } from "./run/useRunStream";

function WorkflowCanvasInner({
  appId,
  workflowId,
}: {
  appId: string;
  workflowId: string | null;
}) {
  const store = useWorkflowStore();
  const run = useRunStream();
  const runState = useRunStore();
  // ... existing canvas local state
}
```

- [ ] **Step 2: Rewrite handleRun and handleStop**

```tsx
const handleRun = async () => {
  if (!workflowId) return;
  await run.runWorkflow(workflowId, { input: "Hello" });
};

const handleStop = () => {
  run.stopRun(runState.currentRunId ?? undefined);
};
```

- [ ] **Step 3: Pass output/events from store to results panel**

```tsx
<WorkflowRunResultsPanel
  nodes={store.nodes}
  events={runState.events}
  output={runState.outputs ? JSON.stringify(runState.outputs, null, 2) : ""}
/>
```

Keep the `output` prop as a string for now to minimize `WorkflowRunResultsPanel` changes. Later we can change the panel to consume `outputs` directly.

- [ ] **Step 4: Remove SSE cleanup useEffect**

`useRunStream` owns the abort controller; remove the unmount cleanup in `WorkflowCanvas`.

- [ ] **Step 5: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/workflow-canvas/WorkflowCanvas.tsx
git commit -m "refactor: move WorkflowCanvas run state to run store"
```

---

## Task 8: Create `stores/canvas.store.ts`

**Files:**

- Create: `frontend/src/stores/canvas.store.ts`

**Interfaces:**

- Produces: `useCanvasStore` with `selectedNodeId`, `isConfigPanelOpen`, `selectNode`, `closeConfigPanel`.

- [ ] **Step 1: Write canvas UI store**

Create `frontend/src/stores/canvas.store.ts`:

```ts
import { create } from "zustand";

interface CanvasStore {
  selectedNodeId: string | null;
  isConfigPanelOpen: boolean;
  selectNode: (id: string | null) => void;
  closeConfigPanel: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  selectedNodeId: null,
  isConfigPanelOpen: false,
  selectNode: (id) =>
    set({ selectedNodeId: id, isConfigPanelOpen: id !== null }),
  closeConfigPanel: () => set({ isConfigPanelOpen: false }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/canvas.store.ts
git commit -m "feat: add canvas UI store"
```

---

## Task 9: Create `features/workflow-canvas/canvas/useCanvasState`

**Files:**

- Create: `frontend/src/features/workflow-canvas/canvas/nodeTypes.ts`
- Create: `frontend/src/features/workflow-canvas/canvas/useNodeIds.ts`
- Create: `frontend/src/features/workflow-canvas/canvas/useCanvasState.ts`

**Interfaces:**

- Produces: `useCanvasState()` returning nodes/edges handlers, `loadGraph`, `getGraph`, `updateNodeData`, `addNode`, `selectNode`.

- [ ] **Step 1: Extract nodeTypes**

Create `frontend/src/features/workflow-canvas/canvas/nodeTypes.ts`:

```ts
import StartNodeComponent from "../nodes/StartNodeComponent";
import EndNodeComponent from "../nodes/EndNodeComponent";
import LLMNodeComponent from "../nodes/LLMNodeComponent";
import IfElseNodeComponent from "../nodes/IfElseNodeComponent";
import HttpNodeComponent from "../nodes/HttpNodeComponent";
import CodeNodeComponent from "../nodes/CodeNodeComponent";
import TemplateNodeComponent from "../nodes/TemplateNodeComponent";
import KnowledgeRetrievalNodeComponent from "../nodes/KnowledgeRetrievalNodeComponent";

export const nodeTypes = {
  start: StartNodeComponent,
  end: EndNodeComponent,
  llm: LLMNodeComponent,
  "if-else": IfElseNodeComponent,
  http: HttpNodeComponent,
  code: CodeNodeComponent,
  template: TemplateNodeComponent,
  "knowledge-retrieval": KnowledgeRetrievalNodeComponent,
};
```

- [ ] **Step 2: Extract node id generator**

Create `frontend/src/features/workflow-canvas/canvas/useNodeIds.ts`:

```ts
import { useRef } from "react";
import type { NodeType } from "../../../types";

export function useNodeIds() {
  const counterRef = useRef(0);

  const nextId = (type: NodeType) => {
    counterRef.current += 1;
    return `${type}-${counterRef.current}`;
  };

  const syncCounter = (nodes: Array<{ id: string }>) => {
    const maxSeen = nodes.reduce((max, node) => {
      const suffix = Number(node.id.match(/-(\d+)$/)?.[1] ?? 0);
      return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, counterRef.current);
    counterRef.current = maxSeen;
  };

  return { nextId, syncCounter };
}
```

- [ ] **Step 3: Write useCanvasState hook**

Create `frontend/src/features/workflow-canvas/canvas/useCanvasState.ts`:

```ts
import { useCallback } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
} from "@xyflow/react";
import { useCanvasStore } from "../../../stores/canvas.store";
import type { NodeConfig, EdgeConfig, Graph, NodeType } from "../../../types";
import { useNodeIds } from "./useNodeIds";

export function useCanvasState() {
  const [nodes, setNodes, onNodesChangeRf] = useNodesState<NodeConfig>([]);
  const [edges, setEdges, onEdgesChangeRf] = useEdgesState<EdgeConfig>([]);
  const { nextId, syncCounter } = useNodeIds();
  const { selectNode } = useCanvasStore();

  const loadGraph = useCallback(
    (graph: Graph) => {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      syncCounter(graph.nodes);
    },
    [setNodes, setEdges, syncCounter]
  );

  const getGraph = useCallback(
    (): Graph => ({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title || n.type,
        position: n.position,
        data: n.data ?? {},
        width: n.width,
        height: n.height,
      })),
      edges,
    }),
    [nodes, edges]
  );

  const updateNodeData = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  const addNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      const newNode: NodeConfig = {
        id: nextId(type),
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        position,
        data: {},
      };
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [nextId, setNodes]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeRf(changes);
    },
    [onNodesChangeRf]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeRf(changes);
    },
    [onEdgesChangeRf]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds) as EdgeConfig[]);
    },
    [setEdges]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    loadGraph,
    getGraph,
    updateNodeData,
    addNode,
    selectNode,
  };
}
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/workflow-canvas/canvas
git commit -m "feat: add useCanvasState hook and extracted canvas helpers"
```

---

## Task 10: Refactor `WorkflowCanvas` Canvas State and `NodeConfigPanel`

**Files:**

- Modify: `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`
- Modify: `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`
- Modify: `frontend/src/pages/AppEditorPage.tsx`

**Interfaces:**

- Consumes: `useCanvasState`, `useCanvasStore`, `nodeTypes`.
- Produces: `WorkflowCanvas` no longer uses `useWorkflowStore` for nodes/edges.

- [ ] **Step 1: Rewrite WorkflowCanvas with useCanvasState**

Replace `useWorkflowStore` canvas-related usage with `useCanvasState`. The component now receives `appId` and `workflowId` as props.

Key changes in `frontend/src/features/workflow-canvas/WorkflowCanvas.tsx`:

```tsx
import { useCanvasState } from "./canvas/useCanvasState";
import { nodeTypes } from "./canvas/nodeTypes";
import { useCanvasStore } from "../../stores/canvas.store";

export function WorkflowCanvas({
  appId,
  workflowId,
}: {
  appId: string;
  workflowId: string | null;
}) {
  const canvas = useCanvasState();
  const { selectedNodeId, isConfigPanelOpen, closeConfigPanel } =
    useCanvasStore();
  const run = useRunStream();
  const runState = useRunStore();
  // ... ReactFlow instance ref, toast, drag/drop handlers
}
```

Use `canvas.nodes`, `canvas.edges`, `canvas.onNodesChange`, `canvas.onEdgesChange`, `canvas.onConnect`. Use `canvas.addNode(type, position)` in `onDrop`. Use `canvas.selectNode(id)` on node click.

- [ ] **Step 2: Update handleSave**

```tsx
const handleSave = async () => {
  try {
    const { data } = await saveWorkflow(appId, canvas.getGraph());
    showToast("success", "Workflow saved");
  } catch {
    showToast("error", "Save failed");
  }
};
```

- [ ] **Step 3: Pass props to NodeConfigPanel**

```tsx
{
  isConfigPanelOpen && selectedNodeId && (
    <NodeConfigPanel
      nodeId={selectedNodeId}
      nodes={canvas.nodes}
      appDatasets={appDatasets}
      onUpdateNodeData={canvas.updateNodeData}
      onClose={closeConfigPanel}
    />
  );
}
```

- [ ] **Step 4: Update NodeConfigPanel to receive props**

Modify `frontend/src/features/workflow-canvas/NodeConfigPanel.tsx`:

```tsx
interface NodeConfigPanelProps {
  nodeId: string;
  nodes: NodeConfig[];
  appDatasets: AppDatasetBindingDto[];
  onUpdateNodeData: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({
  nodeId,
  nodes,
  appDatasets,
  onUpdateNodeData,
  onClose,
}: NodeConfigPanelProps) {
  const node = nodes.find((n) => n.id === nodeId);
  // ... rest unchanged except use appDatasets prop and onUpdateNodeData instead of store
}
```

Remove `useWorkflowStore` import.

- [ ] **Step 5: Update AppEditorPage to pass props**

```tsx
<WorkflowCanvas appId={appId} workflowId={workflow?.id ?? null} />
```

- [ ] **Step 6: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/workflow-canvas/WorkflowCanvas.tsx frontend/src/features/workflow-canvas/NodeConfigPanel.tsx frontend/src/pages/AppEditorPage.tsx
git commit -m "refactor: move WorkflowCanvas canvas state to useCanvasState"
```

---

## Task 11: Remove `workflow.store.ts`

**Files:**

- Modify: `frontend/src/stores/workflow.store.ts` → delete
- Modify: `frontend/src/pages/AppEditorPage.tsx` to remove remaining store usage

**Interfaces:**

- No remaining consumer of `useWorkflowStore`.

- [ ] **Step 1: Migrate appDatasets out of workflow store**

`appDatasets` is server state. Move it to `queries/datasets/useAppDatasets.ts` now (a subset of Task 14) so the workflow store can be removed.

Create `frontend/src/queries/datasets/keys.ts`:

```ts
export const datasetKeys = {
  all: ["datasets"] as const,
  appBindings: (appId: string) =>
    [...datasetKeys.all, "bindings", appId] as const,
};
```

Create `frontend/src/queries/datasets/useAppDatasets.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { listAppDatasets } from "../../services/api";
import { datasetKeys } from "./keys";

export function useAppDatasets(appId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.appBindings(appId ?? ""),
    queryFn: () => listAppDatasets(appId!),
    enabled: Boolean(appId),
  });
}
```

- [ ] **Step 2: Update AppEditorPage to use useAppDatasets**

```tsx
import { useAppDatasets } from "../queries/datasets/useAppDatasets";

const { data: appDatasets = [] } = useAppDatasets(appId);
```

Remove `useWorkflowStore` import and `setAppDatasets` usage.

- [ ] **Step 3: Delete workflow.store.ts**

```bash
rm frontend/src/stores/workflow.store.ts
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove workflow.store.ts and migrate appDatasets to query"
```

---

## Task 12: Migrate `ChatPage`

**Files:**

- Create: `frontend/src/queries/conversations/keys.ts`
- Create: `frontend/src/queries/conversations/useConversations.ts`
- Create: `frontend/src/queries/conversations/useCreateConversation.ts`
- Create: `frontend/src/queries/conversations/useMessages.ts`
- Create: `frontend/src/queries/conversations/useDeleteConversation.ts`
- Create: `frontend/src/features/chat/useChatStream.ts`
- Modify: `frontend/src/pages/ChatPage.tsx`

**Interfaces:**

- Consumes: `useRunStore`, conversation queries.
- Produces: `useChatStream()` and migrated `ChatPage`.

- [ ] **Step 1: Create conversation queries**

Create `frontend/src/queries/conversations/keys.ts`:

```ts
export const conversationKeys = {
  byApp: (appId: string) => ["conversations", "by-app", appId] as const,
  messages: (id: string) => ["conversations", id, "messages"] as const,
};
```

Create `frontend/src/queries/conversations/useConversations.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { listConversations } from "../../services/api";
import { conversationKeys } from "./keys";

export function useConversations(appId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.byApp(appId ?? ""),
    queryFn: () => listConversations(appId!),
    enabled: Boolean(appId),
  });
}
```

Create `frontend/src/queries/conversations/useCreateConversation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConversation } from "../../services/api";
import { conversationKeys } from "./keys";

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => createConversation(appId),
    onSuccess: (_, appId) =>
      queryClient.invalidateQueries({
        queryKey: conversationKeys.byApp(appId),
      }),
  });
}
```

Create `frontend/src/queries/conversations/useMessages.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { getMessages } from "../../services/api";
import { conversationKeys } from "./keys";

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationKeys.messages(conversationId ?? ""),
    queryFn: () => getMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}
```

Create `frontend/src/queries/conversations/useDeleteConversation.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteConversation } from "../../services/api";
import { conversationKeys } from "./keys";

export function useDeleteConversation(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteConversation,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: conversationKeys.byApp(appId),
      }),
  });
}
```

- [ ] **Step 2: Write useChatStream**

Create `frontend/src/features/chat/useChatStream.ts`:

```ts
import { useRef } from "react";
import { useRunStore } from "../../stores/run.store";
import { subscribeToJsonStream } from "../../services/sse";
import { API_BASE_URL } from "../../services/api";
import type { GraphEngineEvent } from "../../types";

export function useChatStream() {
  const store = useRunStore();
  const abortRef = useRef<AbortController | null>(null);

  const run = async (
    conversationId: string,
    workflowId: string,
    inputs: Record<string, unknown>
  ) => {
    store.resetRun();

    abortRef.current = subscribeToJsonStream<GraphEngineEvent>(
      `${API_BASE_URL}/conversations/${conversationId}/runs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId, inputs }),
        onEvent: (event) => {
          store.addEvent(event);
          if (event.event === "node_start") {
            store.setExecutingNode(event.nodeId);
          } else if (event.event === "node_end") {
            store.setExecutingNode(null);
          } else if (event.event === "graph_end") {
            store.setOutputs(event.outputs);
          }
        },
        onDone: () => store.finishRun(),
        onError: (err) => store.setError(err),
      }
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.cancelRun();
  };

  return { run, stop, ...store };
}
```

Note: `subscribeToJsonStream` needs to accept `method`, `headers`, `body` options. Update `services/sse.ts` if necessary:

```ts
export interface SseHandlers<T> {
  onEvent: (event: T) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}
```

- [ ] **Step 3: Rewrite ChatPage**

Modify `frontend/src/pages/ChatPage.tsx` to use queries and `useChatStream`. Replace manual data fetching, loading, and SSE handling.

Key structure:

```tsx
import { useApp } from "../queries/apps/useApp";
import { useWorkflow } from "../queries/workflows/useWorkflow";
import { useConversations } from "../queries/conversations/useConversations";
import { useMessages } from "../queries/conversations/useMessages";
import { useCreateConversation } from "../queries/conversations/useCreateConversation";
import { useDeleteConversation } from "../queries/conversations/useDeleteConversation";
import { useChatStream } from "../features/chat/useChatStream";

export default function ChatPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { data: app, error: appError } = useApp(appId);
  const { data: workflow } = useWorkflow(appId);
  const { data: conversations = [] } = useConversations(appId);
  const { data: messages = [] } = useMessages(selectedId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation(appId!);
  const chat = useChatStream();

  useEffect(() => {
    if (appError) navigate("/");
  }, [appError, navigate]);

  // ... JSX using query data and chat stream state
}
```

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/queries/conversations frontend/src/features/chat/useChatStream.ts frontend/src/pages/ChatPage.tsx frontend/src/services/sse.ts
git commit -m "refactor: migrate ChatPage to queries and useChatStream"
```

---

## Task 13: Migrate `AppDatasetBindingsDrawer` and `RetrievalDebugDrawer`

**Files:**

- Create: `frontend/src/queries/datasets/useDatasets.ts`
- Create: `frontend/src/queries/datasets/useBindAppDataset.ts`
- Create: `frontend/src/queries/datasets/useUnbindAppDataset.ts`
- Create: `frontend/src/queries/datasets/useDebugRetrieve.ts`
- Modify: `frontend/src/features/app-datasets/AppDatasetBindingsDrawer.tsx`
- Modify: `frontend/src/features/retrieval-debug/RetrievalDebugDrawer.tsx`

**Interfaces:**

- Produces: dataset query hooks; drawers consume queries instead of calling `api.ts`.

- [ ] **Step 1: Create dataset queries**

Create `frontend/src/queries/datasets/useDatasets.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { listDatasets } from "../../services/api";
import { datasetKeys } from "./keys";

export function useDatasets() {
  return useQuery({ queryKey: datasetKeys.all, queryFn: listDatasets });
}
```

Create `frontend/src/queries/datasets/useBindAppDataset.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bindAppDataset } from "../../services/api";
import { datasetKeys } from "./keys";

export function useBindAppDataset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => bindAppDataset(appId, datasetId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: datasetKeys.appBindings(appId),
      }),
  });
}
```

Create `frontend/src/queries/datasets/useUnbindAppDataset.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unbindAppDataset } from "../../services/api";
import { datasetKeys } from "./keys";

export function useUnbindAppDataset(appId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datasetId: string) => unbindAppDataset(appId, datasetId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: datasetKeys.appBindings(appId),
      }),
  });
}
```

Create `frontend/src/queries/datasets/useDebugRetrieve.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { debugRetrieve } from "../../services/api";
import type { RetrieveRequestDto } from "../../types";

export function useDebugRetrieve() {
  return useMutation({
    mutationFn: (input: RetrieveRequestDto) => debugRetrieve(input),
  });
}
```

- [ ] **Step 2: Update AppDatasetBindingsDrawer**

Replace manual `listDatasets`/`listAppDatasets`/`bindAppDataset`/`unbindAppDataset` calls with query hooks. The drawer receives `appId` and `appName`; bindings come from `useAppDatasets(appId)`.

- [ ] **Step 3: Update RetrievalDebugDrawer**

Replace `debugRetrieve` call with `useDebugRetrieve` mutation.

- [ ] **Step 4: Run typecheck and tests**

```bash
pnpm run typecheck
pnpm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/queries/datasets frontend/src/features/app-datasets frontend/src/features/retrieval-debug
git commit -m "refactor: migrate dataset drawers to TanStack Query"
```

---

## Task 14: Add Error Boundary

**Files:**

- Create: `frontend/src/components/ErrorBoundary.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**

- Produces: `ErrorBoundary` component.

- [ ] **Step 1: Create ErrorBoundary**

Create `frontend/src/components/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen items-center justify-center text-slate-600">
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h1 className="text-lg font-semibold text-slate-900">
                Something went wrong
              </h1>
              <p className="mt-2 text-sm">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap routes in App.tsx**

Modify `frontend/src/App.tsx`:

```tsx
import { ErrorBoundary } from "./components/ErrorBoundary";

// Inside return:
<ErrorBoundary>
  <Routes>...</Routes>
</ErrorBoundary>;
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm run typecheck
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ErrorBoundary.tsx frontend/src/App.tsx
git commit -m "feat: add error boundary"
```

---

## Task 15: Final Verification and Cleanup

**Files:**

- All modified files.

- [ ] **Step 1: Run full typecheck**

```bash
pnpm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Run full test suite**

```bash
pnpm run test
```

Expected: all tests pass.

- [ ] **Step 3: Verify no remaining `useWorkflowStore` usages**

```bash
grep -r "useWorkflowStore\|workflow.store" frontend/src --include="*.ts" --include="*.tsx"
```

Expected: no matches.

- [ ] **Step 4: Verify `api.ts` still exports needed functions**

```bash
pnpm run typecheck
```

Expected: pass.

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification and cleanup for state architecture refactor"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Every section of `2026-07-06-frontend-state-architecture-design.md` is mapped to at least one task.
- [ ] **No placeholders:** No "TBD", "TODO", or vague instructions remain.
- [ ] **Type consistency:** `RunState`, `RunAction`, `useRunStream`, `useChatStream` use the same event/output/error shapes.
- [ ] **Dependencies:** Task order respects dependencies (e.g., run store before run stream, canvas store before canvas hook, queries before page migration).
