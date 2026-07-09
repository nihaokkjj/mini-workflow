import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useApp } from "../queries/apps/useApp";
import { useWorkflow } from "../queries/workflows/useWorkflow";
import { useConversations } from "../queries/conversations/useConversations";
import { useCreateConversation } from "../queries/conversations/useCreateConversation";
import { useMessages } from "../queries/conversations/useMessages";
import { useDeleteConversation } from "../queries/conversations/useDeleteConversation";
import { conversationKeys } from "../queries/conversations/keys";
import { useChatStream } from "../features/chat/useChatStream";
import { useRunStore } from "../stores/run.store";
import type { MessageDto } from "../types";

export default function ChatPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: app, error: appError } = useApp(appId);
  const { data: workflow } = useWorkflow(appId);
  const workflowId = workflow?.id ?? null;
  const { data: conversations = [] } = useConversations(appId);
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation(appId!);
  const chat = useChatStream();
  const runState = useRunStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const chatRequestedForNewConversation = useRef(false);
  const { data: messages = [] } = useMessages(
    selectedId && !chatRequestedForNewConversation ? selectedId : undefined
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState("");
  const [optimisticUserMessages, setOptimisticUserMessages] = useState<
    MessageDto[]
  >([]);
  const [toast, setToast] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const skipNextMessageLoadRef = useRef<string | null>(null);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming, optimisticUserMessages]);

  useEffect(() => {
    if (appError) navigate("/");
  }, [appError, navigate]);

  useEffect(() => {
    setOptimisticUserMessages([]);
  }, [selectedId]);

  const handleSend = async () => {
    if (!input.trim() || !workflowId || runState.isRunning) return;

    const query = input.trim();
    setInput("");
    let convId = selectedId;
    let runFailed = false;

    if (!convId) {
      try {
        chatRequestedForNewConversation.current = true;
        const { data } = await createConversation.mutateAsync(appId!);
        convId = data.id;
        skipNextMessageLoadRef.current = convId;
        setSelectedId(convId);
      } catch {
        chatRequestedForNewConversation.current = false;
        showToast("Failed to create conversation");
        return;
      }
    }

    const optimistic: MessageDto = {
      id: `temp-user-${Date.now()}`,
      conversationId: convId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };
    setOptimisticUserMessages((prev) => [...prev, optimistic]);
    setStreaming("");

    await chat.run(
      convId,
      workflowId,
      { query },
      {
        onChunk: (text) => setStreaming((prev) => prev + text),
        onError: (message) => {
          runFailed = true;
          showToast(message);
        },
        onDone: () => {
          if (!runFailed) {
            setStreaming("");
          }
          setOptimisticUserMessages([]);
          queryClient.invalidateQueries({
            queryKey: conversationKeys.messages(convId),
          });
          queryClient.invalidateQueries({
            queryKey: conversationKeys.byApp(appId!),
          });
        },
      }
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConversation.mutateAsync(id);
      if (selectedId === id) setSelectedId(null);
    } catch {
      showToast("Failed to delete conversation");
    }
  };

  const displayMessages: MessageDto[] = [
    ...messages,
    ...optimisticUserMessages.filter(
      (om) => !messages.some((m) => m.id === om.id)
    ),
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-72 flex-col border-r border-violet-200/80 bg-white/68 backdrop-blur">
        <div className="flex h-12 items-center justify-between border-b border-violet-200/80 px-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-[#6b5a8b] transition hover:text-[#2f2147]"
          >
            ← Back
          </button>
          <span className="truncate text-sm font-semibold text-[#4b377f]">
            {app?.name}
          </span>
        </div>
        <button
          onClick={() => {
            chatRequestedForNewConversation.current = false;
            setSelectedId(null);
          }}
          className="m-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, #a068ff 0%, #42dcdb 100%)",
          }}
        >
          New Chat
        </button>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                chatRequestedForNewConversation.current = false;
                setSelectedId(c.id);
              }}
              className={`flex cursor-pointer items-center justify-between rounded-lg p-3 text-sm transition ${
                selectedId === c.id
                  ? "border border-accent/30 bg-accent/[0.08]"
                  : "border border-transparent hover:bg-violet-50"
              }`}
            >
              <span className="truncate text-[#5e4b85]">
                Conversation {c.id.slice(0, 8)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(c.id);
                }}
                className="ml-2 text-[#b2a6cc] transition hover:text-red-500"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col bg-[#f3efff]">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {displayMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-accent text-white"
                    : "border border-violet-200 bg-white/92 text-[#2f2147]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-lg border border-violet-200 bg-white/92 px-4 py-2 text-sm whitespace-pre-wrap text-[#2f2147]">
                {streaming}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-violet-200/80 bg-white/72 p-4 backdrop-blur">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm text-[#2f2147] placeholder:text-[#8b7aa9] transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
              placeholder={
                workflowId
                  ? "Type a message..."
                  : "No workflow found for this app"
              }
              value={input}
              disabled={!workflowId || runState.isRunning}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
            />
            <button
              onClick={handleSend}
              disabled={!workflowId || runState.isRunning || !input.trim()}
              className="rounded-xl px-5 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
              }}
            >
              {runState.isRunning ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border border-red-200 bg-white/95 px-4 py-3 text-sm text-[#2f2147] shadow-xl backdrop-blur-2xl">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          {toast}
        </div>
      )}
    </div>
  );
}
