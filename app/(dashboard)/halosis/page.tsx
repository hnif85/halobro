"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Users,
  MessageSquare,
  Megaphone,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Database,
  ExternalLink,
  Search,
  Phone,
  Clock,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  BarChart3,
  Loader2,
  X,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableRowSkeleton } from "@/components/ui/skeleton";

interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
  added?: number;
  updated?: number;
  total?: number;
  totalFetched?: number;
  pagesProcessed?: number;
  totalPages?: number;
}

interface SyncStatusInfo {
  lastSyncAt: string | null;
  total: number;
  status: "synced" | "never";
}

interface SyncStatusData {
  contacts: SyncStatusInfo;
  messages: SyncStatusInfo;
}

interface HalosisContact {
  id: string;
  cell_phone: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  business_name: string | null;
  gender: string | null;
  birth_date: string | null;
  job_position: string | null;
  chat_contact_wa_label: Array<{ name: string; color: string }>;
  synced_at: string;
}

interface HalosisMessage {
  id: string;
  from_phone: string;
  to_phone: string;
  type: string;
  template_name: string | null;
  status: string;
  sent_at: string;
  synced_at: string;
}

interface BlastSummary {
  template_name: string;
  total_sent: number;
  total_delivered: number;
  total_read: number;
  total_failed: number;
  total_replied: number;
  first_sent: string | null;
  last_sent: string | null;
}

interface BlastRecipient {
  to_phone: string;
  status: string;
  sent_at: string | null;
  email?: string;
  name?: string;
  message_body?: string;
  has_reply?: boolean;
}

interface ConversationMessage {
  message: string;
  direction: "in" | "out";
  agent_name: string | null;
  status: string;
  sent_at: string;
  from_phone: string;
  to_phone: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const tabs = [
  { id: "sync", label: "Sync", icon: RefreshCw },
  { id: "contacts", label: "Kontak", icon: Users },
  { id: "messages", label: "Pesan", icon: MessageSquare },
  { id: "blast", label: "Blast", icon: Megaphone },
] as const;

type Tab = (typeof tabs)[number]["id"];

const LIMIT = 20;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    sent: "bg-blue-500/10 text-blue-400",
    delivered: "bg-emerald-500/10 text-emerald-400",
    read: "bg-violet-500/10 text-violet-400",
    failed: "bg-red-500/10 text-red-400",
    pending: "bg-amber-500/10 text-amber-400",
  };
  return map[status] || "bg-zinc-500/10 text-zinc-400";
}

export default function HalosisPage() {
  const [activeTab, setActiveTab] = useState<Tab>("sync");

  // Sync state
  const [syncing, setSyncing] = useState<"contacts" | "messages" | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [syncStatusLoading, setSyncStatusLoading] = useState(true);

  // Contacts state
  const [contacts, setContacts] = useState<HalosisContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsTotalPages, setContactsTotalPages] = useState(0);
  const [contactsSearch, setContactsSearch] = useState("");

  // Messages state
  const [messages, setMessages] = useState<HalosisMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messagesTotalPages, setMessagesTotalPages] = useState(0);
  const [messagesSearch, setMessagesSearch] = useState("");
  const [messagesType, setMessagesType] = useState("");
  const [messagesTemplate, setMessagesTemplate] = useState("");
  const [messagesStartDate, setMessagesStartDate] = useState("");
  const [messagesEndDate, setMessagesEndDate] = useState("");

  // Blast state
  const [blasts, setBlasts] = useState<BlastSummary[]>([]);
  const [blastsLoading, setBlastsLoading] = useState(false);
  const [blastsPage, setBlastsPage] = useState(1);
  const [blastsTotal, setBlastsTotal] = useState(0);
  const [blastsTotalPages, setBlastsTotalPages] = useState(0);
  const [blastsSearch, setBlastsSearch] = useState("");
  const [blastsStartDate, setBlastsStartDate] = useState("");
  const [blastsEndDate, setBlastsEndDate] = useState("");
  const [expandedBlast, setExpandedBlast] = useState<string | null>(null);
  const [blastRecipients, setBlastRecipients] = useState<BlastRecipient[]>([]);
  const [blastRecipientsLoading, setBlastRecipientsLoading] = useState(false);
  const [blastRecipientsPage, setBlastRecipientsPage] = useState(1);
  const [blastRecipientsTotal, setBlastRecipientsTotal] = useState(0);
  const [blastRecipientsTotalPages, setBlastRecipientsTotalPages] = useState(0);
  const [exportingBlast, setExportingBlast] = useState(false);
  const [blastsSyncing, setBlastsSyncing] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<BlastRecipient | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [blastsSortField, setBlastsSortField] = useState<string>("last_sent");
  const [blastsSortDir, setBlastsSortDir] = useState<"asc" | "desc">("desc");

  async function syncContacts() {
    setSyncing("contacts");
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/halosis/sync-contacts", { method: "POST" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sync gagal");
      setSyncResult(data);
      fetchSyncStatus();
      fetchContacts(1, contactsSearch);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSyncing(null);
    }
  }

  async function syncMessages() {
    setSyncing("messages");
    setSyncResult(null);
    setSyncError(null);
    try {
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const res = await fetch("/api/halosis/sync-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sync gagal");
      setSyncResult(data);
      fetchSyncStatus();
      fetchMessages(1, messagesSearch, messagesType, messagesTemplate, messagesStartDate, messagesEndDate);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setSyncing(null);
    }
  }

  const fetchContacts = useCallback(async (page: number, search: string) => {
    setContactsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/halosis/contacts?${params}`);
      const data: PaginatedResponse<HalosisContact> = await res.json();
      setContacts(data.data || []);
      setContactsTotal(data.total);
      setContactsTotalPages(data.totalPages);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (
    page: number, search: string, type: string, template: string, startDate: string, endDate: string
  ) => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (template) params.set("template", template);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/halosis/messages?${params}`);
      const data: PaginatedResponse<HalosisMessage> = await res.json();
      setMessages(data.data || []);
      setMessagesTotal(data.total);
      setMessagesTotalPages(data.totalPages);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const fetchSyncStatus = useCallback(async () => {
    setSyncStatusLoading(true);
    try {
      const res = await fetch("/api/halosis/sync-status");
      const data = await res.json();
      if (data.contacts) setSyncStatus(data);
    } catch {
      // silent
    } finally {
      setSyncStatusLoading(false);
    }
  }, []);

  const fetchBlasts = useCallback(async (page: number, search: string, startDate: string, endDate: string) => {
    setBlastsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await fetch(`/api/halosis/blasts?${params}`);
      const result: PaginatedResponse<BlastSummary> = await res.json();
      setBlasts(result.data || []);
      setBlastsTotal(result.total);
      setBlastsTotalPages(result.totalPages);
    } catch {
      setBlasts([]);
    } finally {
      setBlastsLoading(false);
    }
  }, []);

  const fetchBlastRecipients = useCallback(async (template: string, page: number) => {
    setBlastRecipientsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      const res = await fetch(`/api/halosis/blasts/${encodeURIComponent(template)}?${params}`);
      const data: PaginatedResponse<BlastRecipient> = await res.json();
      setBlastRecipients(data.data || []);
      setBlastRecipientsTotal(data.total);
      setBlastRecipientsTotalPages(data.totalPages);
    } catch {
      setBlastRecipients([]);
    } finally {
      setBlastRecipientsLoading(false);
    }
  }, []);

  const syncBlastData = async () => {
    setBlastsSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const res = await fetch("/api/halosis/sync-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: start, endDate: end }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Sync gagal");
      setSyncResult(data);
      fetchSyncStatus();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBlastsSyncing(false);
      fetchBlasts(blastsPage, blastsSearch, blastsStartDate, blastsEndDate);
    }
  };

  const handleExportBlast = async () => {
    setExportingBlast(true);
    try {
      const params = new URLSearchParams();
      if (blastsSearch) params.set("search", blastsSearch);
      if (blastsStartDate) params.set("startDate", blastsStartDate);
      if (blastsEndDate) params.set("endDate", blastsEndDate);
      const res = await fetch(`/api/halosis/blasts/export?${params}`);
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "halosis-blast-report.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExportingBlast(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus]);

  useEffect(() => {
    if (activeTab === "contacts") fetchContacts(contactsPage, contactsSearch);
  }, [activeTab, contactsPage, contactsSearch, fetchContacts]);

  useEffect(() => {
    if (activeTab === "messages") fetchMessages(messagesPage, messagesSearch, messagesType, messagesTemplate, messagesStartDate, messagesEndDate);
  }, [activeTab, messagesPage, messagesSearch, messagesType, messagesTemplate, messagesStartDate, messagesEndDate, fetchMessages]);

  useEffect(() => {
    if (activeTab === "blast") fetchBlasts(blastsPage, blastsSearch, blastsStartDate, blastsEndDate);
  }, [activeTab, blastsPage, blastsSearch, blastsStartDate, blastsEndDate, fetchBlasts]);

  useEffect(() => {
    if (expandedBlast) {
      setBlastRecipientsPage(1);
      fetchBlastRecipients(expandedBlast, 1);
    }
  }, [expandedBlast, fetchBlastRecipients]);

  useEffect(() => {
    if (expandedBlast) fetchBlastRecipients(expandedBlast, blastRecipientsPage);
  }, [blastRecipientsPage, expandedBlast, fetchBlastRecipients]);

  useEffect(() => {
    if (!selectedRecipient) { setConversation([]); return; }
    setConversationLoading(true);
    fetch(`/api/halosis/conversations/${encodeURIComponent(selectedRecipient.to_phone)}`)
      .then(r => r.json())
      .then(d => setConversation(d.messages || []))
      .catch(() => setConversation([]))
      .finally(() => setConversationLoading(false));
  }, [selectedRecipient]);

  function handleBlastsSort(field: string) {
    setBlastsSortDir(prev => blastsSortField === field ? (prev === "asc" ? "desc" : "asc") : "desc");
    setBlastsSortField(field);
  }

  const sortedBlasts = [...blasts].sort((a, b) => {
    const aVal = (a as any)[blastsSortField];
    const bVal = (b as any)[blastsSortField];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal) : aVal - bVal;
    return blastsSortDir === "asc" ? cmp : -cmp;
  });

  function formatTimeAgo(dateStr: string | null): string {
    if (!dateStr) return "Tidak pernah";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit yang lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    return `${days} hari yang lalu`;
  }

  function formatTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    } catch { return dateStr; }
  }

  function SyncCard({
    icon,
    title,
    desc,
    btnLabel,
    onSync,
    syncType,
    statusInfo,
    result,
  }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    btnLabel: string;
    onSync: () => void;
    syncType: "contacts" | "messages";
    statusInfo: SyncStatusInfo | undefined;
    result: SyncResult | null;
  }) {
    const isSyncing = syncing === syncType;
    const progress = result?.pagesProcessed && result?.totalPages
      ? Math.round((result.pagesProcessed / result.totalPages) * 100)
      : null;
    const isLastResult = syncResult === result;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: syncType === "contacts" ? 0.05 : 0.1 }}
        className="card p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
            syncType === "contacts"
              ? "bg-blue-500/15"
              : "bg-emerald-500/15"
          }`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
          </div>
        </div>

        {/* Sync Status Info */}
        {statusInfo && !isSyncing && statusInfo.status === "synced" && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-zinc-600" />
              Terakhir: <span className="text-zinc-300">{formatTimeAgo(statusInfo.lastSyncAt)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BarChart3 size={12} className="text-zinc-600" />
              {statusInfo.total.toLocaleString()} tersimpan
            </span>
          </div>
        )}

        {statusInfo && !isSyncing && statusInfo.status === "never" && (
          <div className="flex items-center gap-1.5 text-xs text-amber-500">
            <AlertCircle size={12} />
            Belum pernah sync
          </div>
        )}

        {/* Progress Bar saat sync */}
        {isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" />
                {progress !== null && result
                  ? `Memproses halaman ${result.pagesProcessed} dari ${result.totalPages}`
                  : "Menyinkronkan..."
                }
              </span>
              {progress !== null && (
                <span className="text-zinc-500 tabular-nums">{progress}%</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: progress ? `${progress}%` : "30%" }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${syncType === "contacts" ? "bg-blue-500" : "bg-emerald-500"}`}
              />
            </div>
          </div>
        )}

        <button
          onClick={onSync}
          disabled={syncing !== null}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
            syncType === "contacts"
              ? "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          {isSyncing ? "Menyinkronkan..." : btnLabel}
        </button>
      </motion.div>
    );
  }

  function renderSyncTab() {
    return (
      <div className="space-y-4">
        {/* Status Connection */}
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
              <Database className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Halosis API</p>
              <p className="text-xs text-zinc-500">api.halosis.id</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {syncStatusLoading && (
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Loader2 size={11} className="animate-spin" />
                  Memuat status...
                </span>
              )}
              {!syncStatusLoading && syncStatus && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Terhubung
                </span>
              )}
            </div>
            <a
              href="https://docs.halosis.id"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Sync Contacts */}
        <SyncCard
          icon={<Users className="h-5 w-5 text-blue-400" />}
          title="Sync Kontak"
          desc="Ambil kontak & label WA dari Halosis, sinkronisasi ke database CRM."
          btnLabel="Sync Kontak Sekarang"
          onSync={syncContacts}
          syncType="contacts"
          statusInfo={syncStatus?.contacts}
          result={syncResult}
        />

        {/* Sync Messages */}
        <SyncCard
          icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
          title="Sync Riwayat Pesan"
          desc="Ambil riwayat percakapan 30 hari terakhir dari Halosis."
          btnLabel="Sync Riwayat 30 Hari"
          onSync={syncMessages}
          syncType="messages"
          statusInfo={syncStatus?.messages}
          result={syncResult}
        />

        {/* Summary Bar */}
        {syncStatus && !syncing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4 bg-white/[0.02] border-dashed border-white/5"
          >
            <div className="flex items-center gap-6 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-blue-400" />
                <strong className="text-white font-medium tabular-nums">{syncStatus.contacts.total.toLocaleString()}</strong>
                Kontak
              </span>
              <span className="text-white/10">|</span>
              <span className="flex items-center gap-1.5">
                <MessageSquare size={13} className="text-emerald-400" />
                <strong className="text-white font-medium tabular-nums">{syncStatus.messages.total.toLocaleString()}</strong>
                Pesan
              </span>
            </div>
          </motion.div>
        )}

        {/* Sync Message Info saat loading */}
        {syncing === "messages" && syncResult && syncResult.pagesProcessed && (
          <div className="card p-3 border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-xs text-emerald-300">
              <Loader2 size={11} className="inline animate-spin mr-1" />
              Sync pesan: halaman {syncResult.pagesProcessed} dari {syncResult.totalPages || "?"} — {syncResult.totalFetched || 0} pesan terkumpul
            </p>
          </div>
        )}

        {/* Result / Error */}
        <AnimatePresence>
          {syncResult && syncing === null && (
            <motion.div
              key="sync-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card p-4 border border-emerald-500/20 bg-emerald-500/5"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-300">Sync Berhasil</p>
                  <p className="text-xs text-zinc-400 mt-1">{syncResult.message}</p>
                  {(syncResult.pagesProcessed !== undefined || syncResult.added !== undefined || syncResult.updated !== undefined || syncResult.totalFetched !== undefined) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                      {syncResult.pagesProcessed !== undefined && (
                        <span className="text-zinc-400">Halaman: <span className="text-white font-medium">{syncResult.pagesProcessed}</span></span>
                      )}
                      {syncResult.added !== undefined && (
                        <span className="text-zinc-400">Baru: <span className="text-white font-medium">{syncResult.added}</span></span>
                      )}
                      {syncResult.updated !== undefined && (
                        <span className="text-zinc-400">Diupdate: <span className="text-white font-medium">{syncResult.updated}</span></span>
                      )}
                      {syncResult.totalFetched !== undefined && (
                        <span className="text-zinc-400">Pesan: <span className="text-white font-medium">{syncResult.totalFetched}</span></span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {syncError && (
            <motion.div
              key="sync-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card p-4 border border-red-500/20 bg-red-500/5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-300">Sync Gagal</p>
                  <p className="text-xs text-zinc-400 mt-1">{syncError}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function renderTable<T>(
    data: T[],
    loading: boolean,
    page: number,
    totalPages: number,
    total: number,
    search: string,
    onSearch: (v: string) => void,
    onPage: (p: number) => void,
    columns: { key: string; label: string; className?: string; render: (item: T) => React.ReactNode }[],
    filterBar?: React.ReactNode
  ) {
    return (
      <div>
        {filterBar ? filterBar : (
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => { onSearch(e.target.value); onPage(1); }}
                placeholder="Cari..."
                className="input-field pl-9"
              />
            </div>
            <span className="text-xs text-zinc-500">{total} total</span>
          </div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/7">
                  {columns.map((col) => (
                    <th key={col.key} className={cn("px-4 py-3 text-left text-xs font-medium text-zinc-500", col.className)}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={columns.length} />
                ))}
              </tbody>
            </table>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database size={32} className="text-zinc-700 mb-3" />
              <p className="text-zinc-400 font-medium">Belum ada data</p>
              <p className="mt-1 text-sm text-zinc-600">Lakukan sync dari tab Sync</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/7">
                  {columns.map((col) => (
                    <th key={col.key} className={cn("px-4 py-3 text-left text-xs font-medium text-zinc-500", col.className)}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((item, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-white/4 transition-colors duration-150"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3", col.className)}>
                        {col.render(item)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-zinc-500">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => onPage(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderContactsTab() {
    return renderTable(
      contacts,
      contactsLoading,
      contactsPage,
      contactsTotalPages,
      contactsTotal,
      contactsSearch,
      setContactsSearch,
      setContactsPage,
      [
        { key: "phone", label: "No. HP", render: (c: HalosisContact) => (
          <div className="flex items-center gap-2">
            <Phone size={13} className="text-zinc-600 shrink-0" />
            <span className="text-sm text-white font-mono">{c.cell_phone}</span>
          </div>
        )},
        { key: "name", label: "Nama", render: (c: HalosisContact) => (
          <span className="text-sm text-white">{c.name || "-"}</span>
        )},
        { key: "email", label: "Email", render: (c: HalosisContact) => (
          <span className="text-xs text-zinc-400">{c.email || "-"}</span>
        )},
        { key: "labels", label: "Label", render: (c: HalosisContact) => (
          <div className="flex flex-wrap gap-1">
            {c.chat_contact_wa_label?.length > 0
              ? c.chat_contact_wa_label.slice(0, 3).map((l, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-400">
                    <Tag size={10} />{l.name}
                  </span>
                ))
              : <span className="text-xs text-zinc-600">-</span>
            }
          </div>
        )},
        { key: "synced_at", label: "Sync", className: "text-right", render: (c: HalosisContact) => (
          <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">
            <Clock size={12} />
            {formatDate(c.synced_at)}
          </div>
        )},
      ]
    );
  }

  const typeFilters = [
    { id: "", label: "All" },
    { id: "RESOLVED", label: "RESOLVED" },
    { id: "AUTO_REPLY", label: "AUTO REPLY" },
    { id: "NEED_FU", label: "NEED FU" },
  ];

  function resetMessagesPage() { setMessagesPage(1); }

  function renderBlastsTab() {
    const totalDelivered = blasts.reduce((s, b) => s + b.total_delivered, 0);
    const totalRead = blasts.reduce((s, b) => s + b.total_read, 0);
    const totalFailed = blasts.reduce((s, b) => s + b.total_failed, 0);
    const totalSent = blasts.reduce((s, b) => s + b.total_sent, 0);
    const totalReplied = blasts.reduce((s, b) => s + (b.total_replied || 0), 0);

    const statCards = [
      { label: "Total Blast", value: String(blasts.length), unit: "Template", color: "text-blue-400", bg: "bg-blue-500/10" },
      { label: "Terkirim", value: totalSent.toLocaleString(), unit: "Pesan", color: "text-emerald-400", bg: "bg-emerald-500/10" },
      { label: "Terbaca", value: totalRead.toLocaleString(), unit: "Pesan", color: "text-violet-400", bg: "bg-violet-500/10" },
      { label: "Balas", value: totalReplied.toLocaleString(), unit: "Penerima", color: "text-amber-400", bg: "bg-amber-500/10" },
      { label: "Gagal", value: totalFailed.toLocaleString(), unit: "Pesan", color: "text-red-400", bg: "bg-red-500/10" },
    ];

    const filterBar = (
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={blastsSearch}
            onChange={(e) => { setBlastsSearch(e.target.value); setBlastsPage(1); }}
            placeholder="Cari template..."
            className="input-field pl-8 py-1.5 text-xs"
          />
        </div>
        <div className="relative">
          <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="date"
            value={blastsStartDate}
            onChange={(e) => { setBlastsStartDate(e.target.value); setBlastsPage(1); }}
            className="input-field pl-8 py-1.5 text-xs w-[140px]"
          />
        </div>
        <span className="text-xs text-zinc-600">—</span>
        <div className="relative">
          <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="date"
            value={blastsEndDate}
            onChange={(e) => { setBlastsEndDate(e.target.value); setBlastsPage(1); }}
            className="input-field pl-8 py-1.5 text-xs w-[140px]"
          />
        </div>
        <button
          onClick={syncBlastData}
          disabled={blastsSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={13} className={blastsSyncing ? "animate-spin" : ""} />
          {blastsSyncing ? "Menyinkronkan..." : "Sync Blast"}
        </button>
        {syncStatus?.messages && syncStatus.messages.status === "synced" && !blastsSyncing && (
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 whitespace-nowrap">
            <Clock size={10} />
            Sync: {formatTimeAgo(syncStatus.messages.lastSyncAt)}
          </span>
        )}
        <button
          onClick={handleExportBlast}
          disabled={exportingBlast || blasts.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={13} />
          {exportingBlast ? "Mengexport..." : "Export Excel"}
        </button>
        <span className="text-xs text-zinc-500">{blastsTotal} template</span>
      </div>
    );

    return (
      <>
      <div className="space-y-4">
        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <Megaphone className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                  <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-zinc-600">{s.unit}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div>
          {filterBar}

          <div className="card overflow-hidden">
            {blastsLoading ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/7">
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Template</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Terkirim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Terkirim</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Terbaca</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Balas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Gagal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Rentang Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRowSkeleton key={i} cols={7} />
                  ))}
                </tbody>
              </table>
            ) : blasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Megaphone size={32} className="text-zinc-700 mb-3" />
                <p className="text-zinc-400 font-medium">Belum ada data blast</p>
                <p className="mt-1 text-sm text-zinc-600">Blast akan muncul setelah sync pesan</p>
              </div>
            ) : (
              <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/7">
                      <th
                        onClick={() => handleBlastsSort("template_name")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Template {blastsSortField === "template_name" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("total_sent")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Dikirim {blastsSortField === "total_sent" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("total_delivered")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Sampai {blastsSortField === "total_delivered" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("total_read")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Dibaca {blastsSortField === "total_read" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("total_replied")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Balas {blastsSortField === "total_replied" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("total_failed")}
                        className="px-4 py-3 text-left text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Gagal {blastsSortField === "total_failed" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                      <th
                        onClick={() => handleBlastsSort("last_sent")}
                        className="px-4 py-3 text-right text-xs font-medium text-zinc-500 cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Rentang Waktu {blastsSortField === "last_sent" && (blastsSortDir === "asc" ? "↑" : "↓")}
                      </th>
                    </tr>
                  </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedBlasts.map((b, i) => (
                    <Fragment key={b.template_name}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedBlast(expandedBlast === b.template_name ? null : b.template_name)}
                            className="flex items-center gap-2 text-sm text-white hover:text-violet-400 transition-colors"
                          >
                            <ChevronDown
                              size={13}
                              className={`text-zinc-600 transition-transform duration-150 ${expandedBlast === b.template_name ? "rotate-0" : "-rotate-90"}`}
                            />
                            {b.template_name}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-300">{b.total_sent.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                            {((b.total_delivered / (b.total_sent || 1)) * 100).toFixed(1)}%
                          </span>
                          <span className="ml-2 text-xs text-zinc-500">{b.total_delivered.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-400">
                            {((b.total_read / (b.total_sent || 1)) * 100).toFixed(1)}%
                          </span>
                          <span className="ml-2 text-xs text-zinc-500">{b.total_read.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          {(b.total_replied || 0) > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400">
                              {((b.total_replied / (b.total_sent || 1)) * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">0</span>
                          )}
                          <span className="ml-2 text-xs text-zinc-500">{(b.total_replied || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3">
                          {b.total_failed > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-red-500/10 text-red-400">
                              {b.total_failed.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">
                            <Clock size={12} />
                            {b.first_sent ? formatDate(b.first_sent) : "-"}
                            {" — "}
                            {b.last_sent ? formatDate(b.last_sent) : "-"}
                          </div>
                        </td>
                      </motion.tr>
                      {expandedBlast === b.template_name && (
                        <tr>
                          <td colSpan={7} className="px-0 pb-0">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="bg-violet-500/3 border-t border-violet-500/20"
                            >
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-xs font-medium text-violet-300">Penerima: {b.template_name}</p>
                                  <span className="text-[10px] text-zinc-500">{blastRecipientsTotal} penerima</span>
                                </div>
                                {blastRecipientsLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="h-5 w-5 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                                  </div>
                                ) : blastRecipients.length === 0 ? (
                                  <p className="text-xs text-zinc-600 text-center py-4">Tidak ada data penerima</p>
                                ) : (
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-white/7">
                                        <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500">No. HP</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500">Nama</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500">Email</th>
                                        <th className="px-3 py-2 text-left text-[10px] font-medium text-zinc-500">Status</th>
                                        <th className="px-3 py-2 text-center text-[10px] font-medium text-zinc-500">Balasan</th>
                                        <th className="px-3 py-2 text-right text-[10px] font-medium text-zinc-500">Waktu Kirim</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {blastRecipients.map((r, ri) => (
                                        <tr
                                          key={ri}
                                          onClick={() => setSelectedRecipient(r)}
                                          className="hover:bg-white/4 transition-colors duration-150 cursor-pointer"
                                        >
                                          <td className="px-3 py-2">
                                            <span className="text-xs text-white font-mono">{r.to_phone}</span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="text-xs text-zinc-300">{r.name || "—"}</span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="text-xs text-zinc-400">{r.email || "—"}</span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium capitalize", getStatusBadge(r.status))}>
                                              {r.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-center">
                                            {r.has_reply ? (
                                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400" title="Ada balasan">
                                                <Reply size={11} />
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-zinc-600">—</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 text-right">
                                            <span className="text-[10px] text-zinc-500">{r.sent_at ? formatDate(r.sent_at) : "-"}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {blastRecipientsTotalPages > 1 && (
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/7">
                                    <span className="text-[10px] text-zinc-500">
                                      Halaman {blastRecipientsPage} dari {blastRecipientsTotalPages}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => setBlastRecipientsPage(p => p - 1)}
                                        disabled={blastRecipientsPage <= 1}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        <ChevronLeft size={11} /> Prev
                                      </button>
                                      <button
                                        onClick={() => setBlastRecipientsPage(p => p + 1)}
                                        disabled={blastRecipientsPage >= blastRecipientsTotalPages}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                      >
                                        Next <ChevronRight size={11} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>



          {blastsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-zinc-500">
                Halaman {blastsPage} dari {blastsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBlastsPage(p => p - 1)}
                  disabled={blastsPage <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  onClick={() => setBlastsPage(p => p + 1)}
                  disabled={blastsPage >= blastsTotalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedRecipient && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex"
            onClick={() => setSelectedRecipient(null)}
          >
            {/* Backdrop */}
            <div className="flex-1 bg-black/60 backdrop-blur-sm" />
            {/* Sidebar */}
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-[480px] max-w-full bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/7 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{selectedRecipient.name || selectedRecipient.to_phone}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-mono truncate">{selectedRecipient.to_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRecipient.email && (
                    <span className="text-[10px] text-zinc-400 hidden sm:block">{selectedRecipient.email}</span>
                  )}
                  {conversation.length > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                      conversation[conversation.length - 1].direction === "in"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {conversation[conversation.length - 1].direction === "in" ? "↩ User" : "↪ Kita"}
                    </span>
                  )}
                  <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium capitalize shrink-0", getStatusBadge(selectedRecipient.status))}>
                    {selectedRecipient.status}
                  </span>
                  <button
                    onClick={() => setSelectedRecipient(null)}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversationLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="h-6 w-6 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                  </div>
                ) : conversation.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare size={24} className="text-zinc-700 mb-2" />
                    <p className="text-xs text-zinc-500">Tidak ada percakapan</p>
                  </div>
                ) : (
                  conversation.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.direction === "out" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] px-3.5 py-2.5 rounded-2xl",
                          msg.direction === "out"
                            ? "bg-violet-600/20 border border-violet-500/20 rounded-br-md"
                            : "bg-zinc-800 border border-white/7 rounded-bl-md"
                        )}
                      >
                        {msg.agent_name && (
                          <p className="text-[9px] text-violet-400 font-medium mb-1 uppercase tracking-wider">{msg.agent_name}</p>
                        )}
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">
                          {msg.message}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1.5">
                          <span className="text-[10px] text-zinc-600">{formatTime(msg.sent_at)}</span>
                          {msg.direction === "out" && (
                            <span className={cn(
                              "inline-block h-2.5 w-2.5 rounded-full",
                              msg.status === "read" ? "bg-emerald-500" :
                              msg.status === "delivered" ? "bg-emerald-500/60" :
                              msg.status === "failed" ? "bg-red-500" : "bg-zinc-600"
                            )} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 shrink-0">
                <span className="text-[10px] text-zinc-600">{conversation.length} pesan</span>
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
    );
  }

  function renderMessagesTab() {
    const filterBar = (
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type pills */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/7">
            {typeFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => { setMessagesType(f.id); resetMessagesPage(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  messagesType === f.id
                    ? "bg-violet-500/20 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Template search */}
          <div className="relative flex-1 min-w-[140px] max-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={messagesTemplate}
              onChange={(e) => { setMessagesTemplate(e.target.value); resetMessagesPage(); }}
              placeholder="Template..."
              className="input-field pl-8 py-1.5 text-xs"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="date"
                value={messagesStartDate}
                onChange={(e) => { setMessagesStartDate(e.target.value); resetMessagesPage(); }}
                className="input-field pl-8 py-1.5 text-xs w-[140px]"
              />
            </div>
            <span className="text-xs text-zinc-600">—</span>
            <div className="relative">
              <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="date"
                value={messagesEndDate}
                onChange={(e) => { setMessagesEndDate(e.target.value); resetMessagesPage(); }}
                className="input-field pl-8 py-1.5 text-xs w-[140px]"
              />
            </div>
          </div>

          {/* Phone search */}
          <div className="relative flex-1 min-w-[140px] max-w-[180px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={messagesSearch}
              onChange={(e) => { setMessagesSearch(e.target.value); resetMessagesPage(); }}
              placeholder="Cari nomor..."
              className="input-field pl-8 py-1.5 text-xs"
            />
          </div>

          <span className="text-xs text-zinc-500">{messagesTotal} total</span>
        </div>
      </div>
    );

    return renderTable(
      messages,
      messagesLoading,
      messagesPage,
      messagesTotalPages,
      messagesTotal,
      messagesSearch,
      setMessagesSearch,
      setMessagesPage,
      [
        { key: "from", label: "Dari", render: (m: HalosisMessage) => (
          <span className="text-sm text-white font-mono">{m.from_phone}</span>
        )},
        { key: "to", label: "Ke", render: (m: HalosisMessage) => (
          <span className="text-sm text-white font-mono">{m.to_phone}</span>
        )},
        { key: "type", label: "Tipe", render: (m: HalosisMessage) => (
          <span className="text-xs text-zinc-400 uppercase">{m.type || "-"}</span>
        )},
        { key: "template", label: "Template", render: (m: HalosisMessage) => (
          <span className="text-xs text-zinc-400">{m.template_name || "-"}</span>
        )},
        { key: "status", label: "Status", render: (m: HalosisMessage) => (
          <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium capitalize", getStatusBadge(m.status))}>
            {m.status}
          </span>
        )},
        { key: "sent_at", label: "Waktu", className: "text-right", render: (m: HalosisMessage) => (
          <div className="flex items-center justify-end gap-1.5 text-xs text-zinc-500">
            <Clock size={12} />
            {formatDate(m.sent_at)}
          </div>
        )},
      ],
      filterBar
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Halosis</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sinkronisasi & lihat data dari Halosis
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/7 w-fit">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active ? "bg-violet-500/20 text-white" : "text-zinc-400 hover:text-white"
              )}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {activeTab === "sync" && renderSyncTab()}
        {activeTab === "contacts" && renderContactsTab()}
        {activeTab === "messages" && renderMessagesTab()}
        {activeTab === "blast" && renderBlastsTab()}
      </motion.div>

      {/* Info Card */}
      <div className="card p-4 bg-white/[0.02] border-dashed border-white/5">
        <p className="text-xs text-zinc-600 leading-relaxed">
          Data Halosis disimpan di tabel terpisah (halosis_contacts & halosis_messages).
        </p>
      </div>
    </div>
  );
}
