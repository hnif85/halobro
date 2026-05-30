"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Clock, Eye, MessageCircle, CheckCircle, XCircle, Reply } from "lucide-react";
import Link from "next/link";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CardSkeleton } from "@/components/ui/skeleton";
import { ChatPanel } from "@/components/ui/chat-panel";
import { cn } from "@/lib/utils";

interface Recipient {
  id: number;
  customer_guid: string;
  full_name: string;
  phone_number: string;
  send_status: string;
  wa_message_id: string;
  sent_at: string;
  delivered_at: string;
  read_at: string;
  replied_at: string;
  reply_text: string;
  error_message: string;
}

interface Campaign {
  id: number;
  name: string;
  message_type: string;
  template_name: string;
  text_body: string;
  status: string;
  created_at: string;
}

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
}

function formatDate(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(date: string) {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}d`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 });
  const [messagePreview, setMessagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState(false);
  const [chatRecipientId, setChatRecipientId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setCampaign(d.campaign);
        setRecipients(d.recipients || []);
        setStats(d.stats || { total: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0 });
        setMessagePreview(d.messagePreview || null);
      })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [id]);

  function refreshRecipients() {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setRecipients(d.recipients || []);
        setStats(d.stats);
      })
      .catch(() => {});
  }

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === "done") {
        const updated = recipients.map((r) => ({ ...r }));
        setStats((s) => ({ ...s, sent: data.sent, failed: data.failed }));
      }
    } finally {
      setSending(false);
    }
  }

  async function saveReply(recipientId: number) {
    const text = replyInputs[recipientId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`/api/campaigns/${id}/recipients/${recipientId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_text: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecipients((prev) =>
          prev.map((r) =>
            r.id === recipientId
              ? { ...r, send_status: "replied", reply_text: text, replied_at: new Date().toISOString() }
              : r
          )
        );
        setReplyingTo(null);
        setReplyInputs((prev) => ({ ...prev, [recipientId]: "" }));
      }
    } catch {}
  }

  const filtered = recipients.filter((r) =>
    statusFilter === "all" || r.send_status === statusFilter
  );

  const statItems = [
    { label: "Total", value: stats.total, icon: <Send size={16} />, color: "violet" as const },
    { label: "Sent", value: stats.sent, icon: <Send size={16} />, color: "violet" as const },
    { label: "Delivered", value: stats.delivered, icon: <CheckCircle size={16} />, color: "lime" as const },
    { label: "Read", value: stats.read, icon: <Eye size={16} />, color: "amber" as const },
    { label: "Replied", value: stats.replied, icon: <MessageCircle size={16} />, color: "lime" as const },
    { label: "Failed", value: stats.failed, icon: <XCircle size={16} />, color: "red" as const },
  ];

  const readRate = stats.delivered > 0 ? Math.round((stats.read / stats.delivered) * 100) : 0;
  const replyRate = stats.delivered > 0 ? Math.round((stats.replied / stats.delivered) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="p-2 rounded-xl hover:bg-white/8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-white">
            {loading ? <span className="shimmer h-6 w-40 inline-block rounded" /> : campaign?.name}
          </h1>
          {campaign && (
            <div className="flex items-center gap-3 mt-1">
              <Badge variant={getStatusBadgeVariant(campaign.status)} dot pulse={campaign.status === "sending"}>
                {getStatusLabel(campaign.status)}
              </Badge>
              <span className="text-xs text-zinc-500">
                {formatDate(campaign.created_at)}
              </span>
            </div>
          )}
        </div>
        {campaign?.status === "draft" && (
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn btn-primary btn-sm"
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send Campaign"}
          </button>
          )}

        </div>

      <div className="grid grid-cols-6 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : statItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-4 text-center"
              >
                <p className="text-xs text-zinc-500 mb-1">{item.label}</p>
                <p className="text-2xl font-bold tabular-nums text-white">{item.value}</p>
                <div className={cn("mt-2 mx-auto", item.color === "lime" && "text-lime-400", item.color === "amber" && "text-amber-400", item.color === "red" && "text-red-400", item.color === "violet" && "text-violet-400")}>
                  {item.icon}
                </div>
              </motion.div>
            ))}
      </div>

      {stats.total > 0 && (
        <div className="card p-5 grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Read Rate</span>
              <span className="text-lg font-bold text-white">{readRate}%</span>
            </div>
            <ProgressBar value={readRate} max={100} color="violet" size="md" />
            <p className="mt-1 text-xs text-zinc-500">{stats.read} dari {stats.delivered} pesan dibaca</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Reply Rate</span>
              <span className="text-lg font-bold text-white">{replyRate}%</span>
            </div>
            <ProgressBar value={replyRate} max={100} color="lime" size="md" />
            <p className="mt-1 text-xs text-zinc-500">{stats.replied} dari {stats.delivered} pesan dibalas</p>
          </div>
        </div>
      )}

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Campaign Info</h3>
          {campaign ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Nama", value: campaign.name },
                { label: "Jenis Pesan", value: campaign.message_type === "template" ? `Template: ${campaign.template_name}` : "Text" },
                { label: "Template", value: campaign.template_name || "—" },
                { label: "Status", value: getStatusLabel(campaign.status) },
                { label: "Diciptakan", value: formatDate(campaign.created_at) },
                { label: "Penerima", value: `${stats.total} orang` },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-xs text-zinc-500">{item.label}</p>
                  <p className="text-white font-medium">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="shimmer h-4 w-24 rounded" />
                  <div className="shimmer h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Isi Pesan */}
          {messagePreview && (
            <div className="space-y-3">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MessageCircle size={16} className="text-violet-400" />
                Isi Pesan
              </h3>
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/8 to-transparent border border-violet-500/15">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-zinc-500">
                    {campaign?.message_type === "template" ? `Template: ${campaign?.template_name}` : "Text"}
                  </span>
                </div>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {messagePreview}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "recipients" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "sent", "delivered", "read", "replied", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  statusFilter === f
                    ? "bg-violet-500/20 border-violet-500/30 text-white"
                    : "border-white/7 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {f === "all" ? "All" : getStatusLabel(f)} (
                {f === "all" ? stats.total : f === "sent" ? stats.sent : f === "delivered" ? stats.delivered : f === "read" ? stats.read : f === "replied" ? stats.replied : stats.failed})
              </button>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#141416] z-10">
                  <tr className="border-b border-white/7">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">No. HP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">WAMID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Sent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Delivered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Read</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Replied</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Balasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/4 transition-colors cursor-pointer"
                      onClick={() => setChatRecipientId(r.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.full_name} size="sm" />
                          <span className="text-sm font-medium text-white">{r.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{r.phone_number?.replace(/^62/, "0")}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(r.send_status)} dot>
                          {getStatusLabel(r.send_status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {r.wa_message_id ? (
                          <span className="text-[10px] text-zinc-500 font-mono truncate block max-w-[100px]" title={r.wa_message_id}>
                            {r.wa_message_id.slice(0, 20)}...
                          </span>
                        ) : r.send_status === "failed" ? (
                          <span className="text-xs text-red-400" title={r.error_message}>Gagal</span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.sent_at ? timeAgo(r.sent_at) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.delivered_at ? timeAgo(r.delivered_at) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.read_at ? timeAgo(r.read_at) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{r.replied_at ? timeAgo(r.replied_at) : "—"}</td>
                      <td className="px-4 py-3">
                        {r.reply_text ? (
                          <span className="text-xs text-lime-400 italic line-clamp-1 max-w-[150px] block" title={r.reply_text}>
                            "{r.reply_text}"
                          </span>
                        ) : r.send_status === "failed" ? (
                          <span className="text-xs text-red-400 line-clamp-1 max-w-[150px] block" title={r.error_message}>
                            {r.error_message || "Gagal"}
                          </span>
                        ) : replyingTo === r.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={replyInputs[r.id] || ""}
                              onChange={(e) =>
                                setReplyInputs((prev) => ({ ...prev, [r.id]: e.target.value }))
                              }
                              onKeyDown={(e) => e.key === "Enter" && saveReply(r.id)}
                              className="input-field text-xs py-1 px-2 w-24"
                              placeholder="Balasan..."
                              autoFocus
                            />
                            <button
                              onClick={() => saveReply(r.id)}
                              className="p-1 rounded hover:bg-white/10 text-lime-400"
                            >
                              <Send size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-zinc-600">—</span>
                            <button
                              onClick={() => setReplyingTo(r.id)}
                              className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-violet-400 transition-colors"
                              title="Input balasan manual"
                            >
                              <Reply size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  Tidak ada recipient dengan filter "{statusFilter}"
                </div>
          )}
          </div>
        </div>
      </div>
      )}

      {activeTab === "performance" && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-white">Top Balasan</h3>
          {recipients
            .filter((r) => r.reply_text)
            .slice(0, 5)
            .map((r, i) => (
              <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/7">
                <Avatar name={r.full_name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-white">{r.full_name}</p>
                  <p className="text-xs text-lime-400/80 mt-0.5">"{r.reply_text}"</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{formatDate(r.replied_at)}</p>
                </div>
              </div>
            ))}
          {recipients.filter((r) => r.reply_text).length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">Belum ada balasan</p>
          )}

          {stats.failed > 0 && (
            <>
              <h3 className="font-semibold text-white mt-6">Gagal Terkirim</h3>
              <div className="divide-y divide-white/5">
                {recipients
                  .filter((r) => r.send_status === "failed")
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm text-white">{r.full_name}</p>
                        <p className="text-xs text-zinc-500">{r.phone_number?.replace(/^62/, "0")}</p>
                      </div>
                      <p className="text-xs text-red-400">{r.error_message || "Unknown error"}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      <ChatPanel
        recipientId={chatRecipientId}
        campaignId={id}
        onClose={() => setChatRecipientId(null)}
        onReplySaved={() => { refreshRecipients(); }}
      />
    </div>
  );
}