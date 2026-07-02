import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getApp,
  getWorkflowByApp,
  listConversations,
  createConversation,
  getMessages,
  deleteConversation,
  startChatRun,
} from "../services/api";
import type { AppDto, ConversationDto, MessageDto, GraphEngineEvent } from "../types";

export default function ChatPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const skipNextMessageLoadRef = useRef<string | null>(null);
  const [app, setApp] = useState<AppDto | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (!appId) return;
    getApp(appId).then(({ data }) => setApp(data)).catch(() => navigate("/"));
    getWorkflowByApp(appId)
      .then(({ data }) => setWorkflowId(data?.id ?? null))
      .catch(() => setWorkflowId(null));
    loadConversations();
  }, [appId, navigate]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    if (skipNextMessageLoadRef.current === selectedId) {
      skipNextMessageLoadRef.current = null;
      return;
    }
    loadMessages(selectedId);
  }, [selectedId]);

  const loadConversations = async () => {
    if (!appId) return;
    try {
      const { data } = await listConversations(appId);
      setConversations(data);
    } catch {
      showToast("Failed to load conversations");
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await getMessages(conversationId);
      setMessages(data);
    } catch {
      showToast("Failed to load messages");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !workflowId || isRunning) return;

    const query = input.trim();
    let conversationId = selectedId;
    if (!conversationId) {
      try {
        const { data } = await createConversation(appId!);
        conversationId = data.id;
        // Keep the optimistic user message visible while the brand-new
        // conversation is still empty on the server.
        skipNextMessageLoadRef.current = conversationId;
        setSelectedId(conversationId);
        setConversations((prev) => [data, ...prev]);
      } catch {
        showToast("Failed to create conversation");
        return;
      }
    }

    const optimisticMessage: MessageDto = {
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInput("");
    setStreaming("");
    setIsRunning(true);
    controllerRef.current?.abort();

    let runFailed = false;

    controllerRef.current = startChatRun(
      conversationId,
      workflowId,
      { query },
      (event: GraphEngineEvent) => {
        if (event.event === "node_chunk") {
          setStreaming((prev) => prev + event.text);
        } else if (event.event === "graph_end") {
          setStreaming((prev) => {
            const outputs = event.outputs as Record<string, unknown>;
            const text = String(outputs.answer ?? outputs.result ?? JSON.stringify(outputs));
            return prev || text;
          });
        } else if (event.event === "error") {
          runFailed = true;
          setStreaming((prev) => prev + `\n[Error: ${event.message}]`);
          showToast(event.message);
        }
      },
      () => {
        setIsRunning(false);
        if (!runFailed) {
          setStreaming("");
        }
        loadMessages(conversationId!);
        loadConversations();
      },
      (err) => {
        runFailed = true;
        setStreaming((prev) => prev + `\n[Error: ${err}]`);
        showToast(err);
        setIsRunning(false);
      },
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      if (selectedId === id) setSelectedId(null);
      loadConversations();
    } catch {
      showToast("Failed to delete conversation");
    }
  };

  return (
    <div className="h-full flex">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-12 border-b border-slate-200 flex items-center px-4 justify-between">
          <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-800 text-sm">← Back</button>
          <span className="font-semibold text-sm text-slate-700 truncate">{app?.name}</span>
        </div>
        <button
          onClick={() => setSelectedId(null)}
          className="m-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`p-3 rounded-lg cursor-pointer text-sm flex justify-between items-center ${selectedId === c.id ? "bg-blue-50 border border-blue-200" : "hover:bg-slate-50 border border-transparent"}`}
            >
              <span className="truncate">Conversation {c.id.slice(0, 8)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="text-slate-400 hover:text-red-500 ml-2"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-800"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[70%] px-4 py-2 rounded-lg text-sm whitespace-pre-wrap bg-white border border-slate-200 text-slate-800">{streaming}</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder={workflowId ? "Type a message..." : "No workflow found for this app"}
              value={input}
              disabled={!workflowId || isRunning}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!workflowId || isRunning || !input.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isRunning ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
