"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Phone, RefreshCw, CheckCheck, Clock } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessage {
  direction: "inbound" | "outbound";
  type: string;
  content: string;
  status?: string;
  created_at: string;
  wa_message_id?: string;
}

interface ChatData {
  customer: {
    full_name: string;
    phone_number: string;
    email: string;
  };
  messages: ChatMessage[];
}

interface ChatPanelProps {
  recipientId: number | null;
  campaignId: string;
  onClose: () => void;
  onReplySaved?: (recipientId: number) => void;
}

function formatChatTime(date: string) {
  return new Date(date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatChatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Hari ini";
  if (d.toDateString() === yesterday.toDateString()) return "Kemarin";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function shouldShowDateSeparator(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(messages[index].created_at).toDateString();
  const prev = new Date(messages[index - 1].created_at).toDateString();
  return curr !== prev;
}

export function ChatPanel({ recipientId, campaignId, onClose, onReplySaved }: ChatPanelProps) {
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, []);

  const fetchChat = useCallback(async (showRefreshing = false) => {
    if (!recipientId) return;
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients/${recipientId}/chat`);
      const data = await res.json();
      setChatData(data);
      scrollToBottom();
    } catch {
      if (showRefreshing) setError("Gagal refresh");
    } finally {
      setRefreshing(false);
    }
  }, [recipientId, campaignId, scrollToBottom]);

  useEffect(() => {
    if (!recipientId) return;

    setError("");
    setLoading(true);
    fetchChat().finally(() => setLoading(false));

    // Polling 5 detik
    pollingRef.current = setInterval(() => fetchChat(), 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [recipientId, fetchChat]);

  async function handleSend() {
    const text = messageText.trim();
    if (!text || sending || !recipientId) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/recipients/${recipientId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal kirim");
        setSending(false);
        return;
      }

      setChatData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              direction: "outbound",
              type: "text",
              content: text,
              status: "sent",
              created_at: data.created_at || new Date().toISOString(),
              wa_message_id: data.wamid,
            },
          ],
        };
      });

      setMessageText("");
      onReplySaved?.(recipientId);
      scrollToBottom();
    } catch {
      setError("Gagal kirim pesan");
    }

    setSending(false);
  }

  const grouped = chatData?.messages || [];

  return (
    <AnimatePresence>
      {recipientId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 h-full w-[440px] max-w-full z-50 bg-[#0d0d0f] border-l border-white/7 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/7">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
              <Avatar name={chatData?.customer.full_name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {chatData?.customer.full_name || "Loading..."}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {chatData?.customer.phone_number?.replace(/^\+/, "").replace(/^62/, "0")}
                </p>
              </div>
              <button
                onClick={() => fetchChat(true)}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-white/8 text-zinc-500 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
              {chatData?.customer.phone_number && (
                <a
                  href={`https://wa.me/${chatData.customer.phone_number.replace(/^\+/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-lime-500/10 text-zinc-500 hover:text-lime-400 transition-colors"
                  title="Buka WhatsApp"
                >
                  <Phone size={16} />
                </a>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {loading ? (
                <div className="space-y-3 pt-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                      <div className={cn("shimmer h-10 w-48 rounded-2xl", i % 2 === 0 ? "rounded-br-md" : "rounded-bl-md")} />
                    </div>
                  ))}
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600">
                  <p className="text-sm">Belum ada pesan</p>
                </div>
              ) : (
                grouped.map((msg, i) => (
                  <div key={`${msg.created_at}-${i}`}>
                    {shouldShowDateSeparator(grouped, i) && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-zinc-600 bg-white/5 px-3 py-1 rounded-full">
                          {formatChatDate(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed",
                          msg.direction === "outbound"
                            ? "bg-violet-500/20 text-white rounded-2xl rounded-br-md border border-violet-500/15"
                            : "bg-white/8 text-zinc-200 rounded-2xl rounded-bl-md border border-white/7"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn("flex items-center gap-1 mt-1", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                          <span className="text-[10px] text-zinc-500">{formatChatTime(msg.created_at)}</span>
                          {msg.direction === "outbound" && (
                            <span className={cn(
                              "text-[10px]",
                              msg.status === "read" || msg.status === "replied" ? "text-lime-400" : "text-zinc-500"
                            )}>
                              {msg.status === "read" || msg.status === "replied" ? (
                                <CheckCheck size={12} className="inline" />
                              ) : msg.status === "sent" || msg.status === "delivered" ? (
                                <CheckCheck size={12} className="inline opacity-50" />
                              ) : (
                                <Clock size={12} className="inline" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/7 p-4 space-y-2">
              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ketik pesan..."
                  className="input-field flex-1"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="btn btn-primary btn-sm !px-3"
                >
                  {sending ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}