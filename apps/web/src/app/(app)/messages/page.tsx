"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useMessageStream } from "@/hooks/use-message-stream";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";

export default function MessagesPage() {
  useMessageStream();
  const searchParams = useSearchParams();
  const initialPartner = searchParams.get("partner");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    initialPartner
  );

  return (
    <div className="space-y-0 h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 pb-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Messages</h1>
      </div>

      <div className="flex h-[calc(100%-3rem)] rounded-lg border border-border overflow-hidden">
        {/* Conversation List - Left Panel */}
        <div
          className={`${
            selectedPartnerId ? "hidden md:flex" : "flex"
          } flex-col w-full md:w-80 shrink-0 bg-[#0A0F1A] border-r border-border overflow-y-auto`}
        >
          <ConversationList
            selectedId={selectedPartnerId}
            onSelect={setSelectedPartnerId}
          />
        </div>

        {/* Message Thread - Right Panel */}
        <div
          className={`${
            !selectedPartnerId ? "hidden md:flex" : "flex"
          } flex-1 flex-col min-w-0 bg-card`}
        >
          {selectedPartnerId ? (
            <MessageThread
              partnerId={selectedPartnerId}
              onBack={() => setSelectedPartnerId(null)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-lg font-medium text-foreground">No conversation selected</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a conversation from the left to start chatting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { data: conversations, isLoading } =
    trpc.message.conversations.useQuery();

  if (isLoading) {
    return (
      <div className="p-2 space-y-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[60px] animate-pulse rounded-lg bg-muted/30" />
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {conversations.map((conv) => (
        <button
          key={conv.partnerId}
          onClick={() => onSelect(conv.partnerId)}
          className={`w-full h-[60px] rounded-lg px-3 text-left transition-colors ${
            selectedId === conv.partnerId
              ? "bg-muted/50"
              : conv.unreadCount > 0
              ? "bg-muted/30 hover:bg-muted/50"
              : "hover:bg-muted/20"
          }`}
        >
          <div className="flex items-center gap-3 h-full">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-semibold text-primary">
                {conv.partnerName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm truncate text-foreground">
                  {conv.partnerName ?? "Unknown"}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full min-w-[20px] h-5 text-xs flex items-center justify-center px-1.5 shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {conv.lastMessage}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function MessageThread({
  partnerId,
  onBack,
}: {
  partnerId: string;
  onBack: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: userData } = trpc.user.me.useQuery();
  const userId = userData?.user?.id;

  const { data: historyData, isLoading } = trpc.message.history.useQuery(
    { partnerId, limit: 50 }
  );

  const markRead = trpc.message.markRead.useMutation({
    onSuccess: () => {
      utils.message.conversations.invalidate();
    },
  });

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      setDraft("");
      utils.message.history.invalidate({ partnerId });
      utils.message.conversations.invalidate();
    },
  });

  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark read when opening conversation
  useEffect(() => {
    markRead.mutate({ partnerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historyData?.messages]);

  function handleSend() {
    const content = draft.trim();
    if (!content) return;
    sendMessage.mutate({ receiverId: partnerId, content });
  }

  const messages = historyData?.messages ?? [];
  // history comes newest-first, reverse for display
  const orderedMessages = [...messages].reverse();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-3 shrink-0">
        <button
          className="md:hidden rounded-md p-1 hover:bg-muted transition-colors text-foreground"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xs font-semibold text-primary">
            ?
          </span>
        </div>
        <span className="font-medium text-sm text-foreground">Conversation</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-10 w-48 animate-pulse rounded-lg bg-muted ${
                  i % 2 === 0 ? "" : "ml-auto"
                }`}
              />
            ))}
          </div>
        ) : orderedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          orderedMessages.map((msg) => {
            const isMine = msg.senderId === userId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg p-3 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 shrink-0">
        <div className="flex gap-2 items-center">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-muted px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none focus:ring-1 focus:ring-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sendMessage.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-50 shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
