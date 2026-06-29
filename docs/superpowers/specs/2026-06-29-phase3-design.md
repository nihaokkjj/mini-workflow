# Phase 3: More Nodes + Chat UI — Design

## Goal

Complete Phase 3 of the Mini-Dify roadmap:

- Backend: HTTP node, Code node (isolated-vm), Template node, Conversation module, Model module.
- Frontend: components and config panels for the three new nodes, a Chat page, and App list polish.
- New apps default to `mode: "chat"`.

## Decision log

- Scope: all Phase 3 items.
- Sandbox: use `isolated-vm` as the roadmap requires.
- Chat persistence: auto-save user input and assistant output as `Message` records tied to a `Conversation`.
- Implementation order: backend-first (new nodes → Model → Conversation/chat-run endpoint → frontend wiring).

---

## 1. Backend — New Node Types

All nodes extend `BaseNode`, implement `async *run()`, yield `node_start`/`node_end`/`error` events, and register in `NodeFactory`.

### 1.1 `HttpNode`

**File:** `backend/src/core/nodes/http.node.ts`

**Data schema:**

```ts
interface HttpNodeData {
  method: "GET" | "POST";
  url: string;          // supports {{variable}}
  headers?: Record<string, string>; // values support {{variable}}
  body?: string;        // supports {{variable}}
  timeout?: number;     // ms, default 30000
}
```

**Behavior:**

1. Yield `node_start`.
2. Resolve `url`, each header value, and `body` via `resolveTemplate()`.
3. Execute with Node 18 `fetch`, using an `AbortController` for the timeout.
4. On 2xx, output `{ status, body, headers }`. Body is plain text; if parseable JSON, also expose `json`.
5. On non-2xx or network error, yield `error` with node id and a concise message.
6. Yield `node_end` with outputs.

### 1.2 `CodeNode`

**File:** `backend/src/core/nodes/code.node.ts`

**Dependency:** add `isolated-vm` to `backend/package.json`.

**Data schema:**

```ts
interface CodeNodeData {
  code: string; // user JS, should end with `return ...`
}
```

**Behavior:**

1. Yield `node_start`.
2. Create an `ivm.Isolate` with an 8 MB memory limit.
3. Build a context that exposes `$inputs` (from `getInputs()`).
4. Compile the code and run it with a 5 s CPU timeout.
5. Transfer the returned value out of the isolate and output `{ result }`.
6. Yield `error` on compile/runtime/timeout failures.
7. Yield `node_end`.

**Security constraint:** never use `eval`, `new Function`, or `vm.runInThisContext`.

### 1.3 `TemplateNode`

**File:** `backend/src/core/nodes/template.node.ts`

**Data schema:**

```ts
interface TemplateNodeData {
  template: string; // supports {{variable}}
}
```

**Behavior:**

1. Yield `node_start`.
2. Call `resolveTemplate(data.template)`.
3. Output `{ text: rendered }`.
4. Yield `node_end`.

### 1.4 Factory registration

Add `http`, `code`, and `template` to `NodeFactory` static registry in `backend/src/core/engine/node-factory.ts`.

---

## 2. Backend — Model Module

**Files:**

- `backend/src/modules/model/model.controller.ts`
- `backend/src/modules/model/model.module.ts`

**Endpoint:** `GET /api/models`

**Behavior:**

- Read `MODELS` env (JSON array of `{ id, name }`) if present.
- Otherwise return a static list: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`, `kimi-latest`.
- Import `ModelModule` in `AppRootModule`.

---

## 3. Backend — Conversation Module

### 3.1 API

**Files:**

- `backend/src/modules/conversation/conversation.controller.ts`
- `backend/src/modules/conversation/conversation.service.ts`
- `backend/src/modules/conversation/conversation.module.ts`

**Endpoints:**

- `POST /api/conversations` — body `{ appId }`, returns `{ id, appId, createdAt }`.
- `GET /api/conversations?appId=...` — list conversations with latest message preview.
- `GET /api/conversations/:id/messages` — list messages ordered by `createdAt` ASC.
- `DELETE /api/conversations/:id` — delete conversation and cascade messages.

### 3.2 Chat-run persistence

**New endpoint:** `POST /api/conversations/:conversationId/runs`

**Body:** `{ workflowId, inputs: Record<string, unknown> }`

**Flow:**

1. Validate the conversation exists and belongs to the app of `workflowId`.
2. Create a `Run` record.
3. Save a `Message` with `role: "user"`, `content` = `inputs.query ?? JSON.stringify(inputs)`.
4. Stream engine events through SSE exactly like `GET /api/runs/:runId/stream`.
5. On `graph_end`, derive assistant content:
   - `outputs.answer` if present,
   - else `outputs.result`,
   - else `JSON.stringify(outputs)`.
6. Save a `Message` with `role: "assistant"`, the derived content, and `nodeId` set to the End node id if known.
7. On error, complete the run as failed and do not save an assistant message.

---

## 4. Frontend — New Node Components & Palette

### 4.1 Node components

Create:

- `frontend/src/features/workflow-canvas/nodes/HttpNodeComponent.tsx`
- `frontend/src/features/workflow-canvas/nodes/CodeNodeComponent.tsx`
- `frontend/src/features/workflow-canvas/nodes/TemplateNodeComponent.tsx`

Each mirrors `LLMNodeComponent`: colored card, icon, one-line preview, target handle top, source handle bottom.

### 4.2 Palette

Add `http`, `code`, `template` entries to `NodePalette.NODE_TEMPLATES`.

### 4.3 Canvas registration

Add the three components to `nodeTypes` in `WorkflowCanvas.tsx`.

### 4.4 Config panel

Extend `NodeConfigPanel.configRenderers`:

- **HTTP:** method select, URL input, headers JSON textarea, body textarea, timeout number.
- **Code:** code textarea.
- **Template:** template textarea.

---

## 5. Frontend — Chat Page

**File:** `frontend/src/pages/ChatPage.tsx`

**Route:** `/app/:appId/chat`

**Layout:**

- Left sidebar (w-72): conversation list for the app, new-conversation button.
- Right area: message stream (top) + input box (bottom).

**Behavior:**

- Load app info and conversation list on mount.
- Selecting a conversation loads its messages via `GET /api/conversations/:id/messages`.
- Sending a message creates a conversation if none selected, then calls `POST /api/conversations/:id/runs` with `{ workflowId, inputs: { query } }`.
- Stream SSE with `subscribeToRunStream`, appending assistant text for a typewriter effect.
- Refresh conversation list after a run.

---

## 6. Frontend — App List Improvements

**File:** `frontend/src/pages/AppListPage.tsx`

Changes:

- Card grid layout with app name, description, mode badge, created date.
- Per-card actions: **Edit** → `/app/:id`, **Chat** → `/app/:id/chat`.
- Delete button opens a confirmation dialog before calling `deleteApp`.
- Creating a new app sends `mode: "chat"`.

---

## 7. Error Handling

- New nodes follow the existing pattern: yield `{ event: "error", nodeId, error }` and stop.
- `HttpNode` surfaces HTTP status/body and timeout errors.
- `CodeNode` surfaces compile, runtime, and CPU timeout errors.
- Chat-run endpoint streams the error event and closes SSE; the run is marked failed.

---

## 8. Verification Plan

1. `pnpm type-check` passes in `backend` and `frontend`.
2. Manual tests:
   - HTTP node calls a mock GET/POST endpoint and exposes status/body.
   - Code node transforms `$inputs` and returns a value.
   - Template node renders `{{nodeId.field}}` references.
   - Chat page creates a conversation, streams an answer, and persists both messages.
   - App list supports create, edit, chat, and delete with confirmation.
