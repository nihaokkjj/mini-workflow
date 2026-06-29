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
  subscribeToRunStream,
} from "../services/api";
import type { AppDto, ConversationDto, MessageDto, GraphEngineEvent } from "../types";

export default function ChatPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppDto | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (!appId) return;
    getApp(appId).then(({ data }) => setApp(data)).catch(() => navigate("/"));
    getWorkflowByApp(appId)
      .then(({ data }) => setWorkflowId(data.id))
      .catch(() => setWorkflowId(null));
    loadConversations();
  }, [appId, navigate]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  const loadConversations = async () => {
    if (!appId) return;
    try {
      const { data } = await listConversations(appId);
      setConversations(data);
    } catch { /* ignore */ }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await getMessages(conversationId);
      setMessages(data);
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!input.trim() || !workflowId || isRunning) return;

    let conversationId = selectedId;
    if (!conversationId) {
      try {
        const { data } = await createConversation(appId!);
        conversationId = data.id;
        setSelectedId(conversationId);
        setConversations((prev) => [data, ...prev]);
      } catch {
        alert("Failed to create conversation");
        return;
      }
    }

    const query = input.trim();
    setInput("");
    setStreaming("");
    setIsRunning(true);
    controllerRef.current?.abort();

    try {
      const { data: runData } = await startChatRun(conversationId, workflowId, { query });
      controllerRef.current = subscribeToRunStream(
        runData.runId,
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
            setStreaming((prev) => prev + `\n[Error: ${event.error}]`);
          }
        },
        () => {
          setIsRunning(false);
          loadMessages(conversationId!);
          loadConversations();
        },
        (err) => {
          setStreaming((prev) => prev + `\n[Error: ${err}]`);
          setIsRunning(false);
        },
      );
    } catch (err: any) {
      setStreaming(`Error: ${err.message}`);
      setIsRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      if (selectedId === id) setSelectedId(null);
      loadConversations();
    } catch {
      alert("Failed to delete conversation");
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
    </div>
  );
}
