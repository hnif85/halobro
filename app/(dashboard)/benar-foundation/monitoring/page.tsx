"use client";

import { useEffect, useState, Fragment } from "react";
import { motion } from "framer-motion";
import {
  Users, X, Plus, ChevronDown, ChevronUp,
  Trash2, FileText, CheckCircle, AlertCircle,
  CreditCard, Activity, Calendar, Megaphone, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface BlastHistoryItem {
  template_name: string;
  status: string;
  sent_at: string | null;
}

interface BenarCustomer {
  id: string;
  guid: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  city: string | null;
  status: string | null;
  is_active: string | null;
  customer_created_at: string | null;
  notes: string | null;
  added_at: string;
  transaction_count: number;
  total_pembelian: number;
  transactions: Array<{ date: string; nominal: number; invoice: string }>;
  app_registered: number;
  last_activity: string | null;
  event_count: number;
  last_event: { name: string; date: string } | null;
  event_names: string[];
  blasts: BlastHistoryItem[];
  blast_count: number;
}

interface AppUsage {
  appName: string;
  package: string | null;
  lastUsed: string;
  totalCredit: number;
  totalDebit: number;
}

type DynamicStatus = "Aktif" | "Idle" | "Pasif";
type StatusVariant = "lime" | "amber" | "red" | "muted";

function getDynamicStatus(lastActivity: string | null): { label: DynamicStatus; variant: StatusVariant } {
  if (!lastActivity) return { label: "Pasif", variant: "red" };
  const days = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
  if (days <= 7) return { label: "Aktif", variant: "lime" };
  if (days <= 30) return { label: "Idle", variant: "amber" };
  return { label: "Pasif", variant: "red" };
}

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

export default function MonitoringPage() {
  const [customers, setCustomers] = useState<BenarCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedGuid, setExpandedGuid] = useState<string | null>(null);
  const [appData, setAppData] = useState<Record<string, AppUsage[]>>({});
  const [appLoading, setAppLoading] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<DynamicStatus | "Semua">("Semua");

  const fetchList = () => {
    setLoading(true);
    fetch("/api/benar-foundation")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, []);

  const handleDelete = async (guid: string) => {
    await fetch(`/api/benar-foundation?guid=${guid}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    fetchList();
  };

  const toggleExpand = (guid: string) => {
    if (expandedGuid === guid) {
      setExpandedGuid(null);
      return;
    }
    setExpandedGuid(guid);
    if (!appData[guid]) {
      setAppLoading((s) => ({ ...s, [guid]: true }));
      fetch(`/api/customers/${guid}/app-usage`)
        .then((r) => r.json())
        .then((d) => setAppData((s) => ({ ...s, [guid]: d.apps || [] })))
        .catch(() => setAppData((s) => ({ ...s, [guid]: [] })))
        .finally(() => setAppLoading((s) => ({ ...s, [guid]: false })));
    }
  };

  const filteredCustomers = filterStatus === "Semua"
    ? customers
    : customers.filter((c) => getDynamicStatus(c.last_activity).label === filterStatus);

  const dynamicActive = customers.filter((c) => getDynamicStatus(c.last_activity).label === "Aktif").length;
  const dynamicIdle = customers.filter((c) => getDynamicStatus(c.last_activity).label === "Idle").length;
  const dynamicPasif = customers.filter((c) => getDynamicStatus(c.last_activity).label === "Pasif").length;

  const summary = {
    total: customers.length,
    active: dynamicActive,
    totalTransactions: customers.reduce((s, c) => s + c.transaction_count, 0),
    totalPembelian: customers.reduce((s, c) => s + c.total_pembelian, 0),
  };

  const statusFilters: Array<{ label: DynamicStatus | "Semua"; count: number }> = [
    { label: "Semua", count: customers.length },
    { label: "Aktif", count: dynamicActive },
    { label: "Idle", count: dynamicIdle },
    { label: "Pasif", count: dynamicPasif },
  ];

  return (
    <>
      <div className="flex items-end justify-between">
        <div />
        <button onClick={() => setShowBulkModal(true)} className="btn btn-primary btn-sm">
          <FileText size={15} />
          Import Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Penerima", value: summary.total, icon: <Users size={20} />, color: "violet" as const },
          { label: "Aktif", value: summary.active, icon: <CheckCircle size={20} />, color: "lime" as const },
          { label: "Total Transaksi", value: summary.totalTransactions, icon: <CreditCard size={20} />, color: "amber" as const },
          { label: "Total Pembelian", value: formatRp(summary.totalPembelian), icon: <Activity size={20} />, color: "red" as const },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="card p-5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${card.color === "violet" ? "bg-violet-500/15 text-violet-400" :
                  card.color === "lime" ? "bg-lime-500/15 text-lime-400" :
                  card.color === "amber" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"}`}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-xs text-zinc-500">{card.label}</p>
                <p className="text-xl font-bold text-white tabular-nums">{card.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilterStatus(f.label)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              filterStatus === f.label
                ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Penerima</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Status</th>
                <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Aplikasi</th>
                <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Transaksi</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Total Pembelian</th>
                <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Event</th>
                <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">Blast</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Terakhir Aktif</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="shimmer h-4 rounded w-full" /></td>
                    ))}
                    <td className="px-4 py-3"><div className="shimmer h-4 w-4 rounded" /></td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Users size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500 text-sm">
                      {filterStatus !== "Semua"
                        ? `Tidak ada penerima dengan status "${filterStatus}"`
                        : "Belum ada penerima dana"}
                    </p>
                    {filterStatus === "Semua" && (
                      <button onClick={() => setShowBulkModal(true)} className="btn btn-primary btn-sm mt-3">
                        <Plus size={14} />
                        Import Excel
                      </button>
                    )}
                  </td>
                </tr>
              ) : filteredCustomers.map((c, i) => {
                const ds = getDynamicStatus(c.last_activity);
                const isExpanded = expandedGuid === c.guid;
                return (
                  <Fragment key={c.guid}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.full_name || ""} />
                          <div>
                            <p className="text-sm font-medium text-white">{c.full_name || "—"}</p>
                            <p className="text-xs text-zinc-500">{c.email || c.phone_number || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={ds.variant} dot={ds.label === "Aktif"}>
                          {ds.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-zinc-300 tabular-nums">{c.app_registered}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-zinc-300 tabular-nums">{c.transaction_count}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-zinc-300 tabular-nums">
                          {c.total_pembelian > 0 ? formatRp(c.total_pembelian) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleExpand(c.guid)}
                          className="flex items-center justify-center gap-1.5 mx-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <Calendar size={13} />
                          {c.event_count || "—"}
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {c.blast_count > 0 ? c.blast_count : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-zinc-500">
                          {c.last_activity
                            ? new Date(c.last_activity).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setShowDeleteConfirm(c.guid)}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-4 pb-4">
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            className="bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden"
                          >
                            {appLoading[c.guid] ? (
                              <div className="p-4 space-y-2">
                                {Array.from({ length: 3 }).map((_, j) => (
                                  <div key={j} className="shimmer h-8 rounded w-full" />
                                ))}
                              </div>
                            ) : (
                              <div className="divide-y divide-white/5">
                                {c.event_names?.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Event Diikuti</p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {c.event_names?.map((name) => (
                                        <span key={name} className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-300">
                                          {name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {c.blasts?.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
                                      Riwayat Blast ({c.blast_count})
                                    </p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-white/5">
                                          <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Template</th>
                                          <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Status</th>
                                          <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Waktu</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {c.blasts.slice(0, 20).map((b, bi) => (
                                          <tr key={bi} className="border-b border-white/5 last:border-0">
                                            <td className="px-2 py-1.5 text-zinc-300">{b.template_name}</td>
                                            <td className="px-2 py-1.5">
                                              <span className={cn(
                                                "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                                                b.status === "read" ? "bg-violet-500/10 text-violet-400" :
                                                b.status === "delivered" ? "bg-emerald-500/10 text-emerald-400" :
                                                b.status === "failed" ? "bg-red-500/10 text-red-400" :
                                                "bg-blue-500/10 text-blue-400"
                                              )}>
                                                {b.status}
                                              </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-zinc-500">
                                              {b.sent_at
                                                ? new Date(b.sent_at).toLocaleDateString("id-ID", {
                                                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                                  })
                                                : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {c.blasts.length > 20 && (
                                      <p className="text-[10px] text-zinc-600 mt-2 text-center">
                                        +{c.blasts.length - 20} blast lainnya
                                      </p>
                                    )}
                                  </div>
                                )}

                                {c.transactions?.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Riwayat Transaksi</p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-white/5">
                                          <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Tanggal</th>
                                          <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Invoice</th>
                                          <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Nominal</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(c.transactions || []).slice(0, 10).map((tx, ti) => (
                                          <tr key={ti} className="border-b border-white/5 last:border-0">
                                            <td className="px-2 py-1.5 text-zinc-300">
                                              {tx.date ? new Date(tx.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                            </td>
                                            <td className="px-2 py-1.5 text-zinc-400">{tx.invoice || "—"}</td>
                                            <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">
                                              Rp {(tx.nominal ?? 0).toLocaleString("id-ID")}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {appData[c.guid]?.length > 0 && (
                                  <div className="px-4 py-3">
                                    <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Penggunaan Aplikasi</p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-white/5">
                                          <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Aplikasi</th>
                                          <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Total Credit</th>
                                          <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Total Debit</th>
                                          <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Sisa Kredit</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(appData[c.guid] || []).map((app) => (
                                          <tr key={app.appName} className="border-b border-white/5 last:border-0">
                                            <td className="px-2 py-1.5 text-zinc-300">{app.appName}</td>
                                            <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">
                                              {app.totalCredit.toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-2 py-1.5 text-right text-zinc-300 tabular-nums">
                                              {app.totalDebit.toLocaleString("id-ID")}
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums font-medium"
                                              style={{ color: app.totalCredit - app.totalDebit > 0 ? "#84cc16" : "#f87171" }}
                                            >
                                              {(app.totalCredit - app.totalDebit).toLocaleString("id-ID")}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {(!appData[c.guid] || appData[c.guid].length === 0) && (!c.event_names || c.event_names.length === 0) && (!c.blasts || c.blasts.length === 0) && (!c.transactions || c.transactions.length === 0) && (
                                  <p className="text-xs text-zinc-500 p-4 text-center">Tidak ada data</p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onImported={() => { setShowBulkModal(false); fetchList(); }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#1c1c1f] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4"
          >
            <h3 className="text-lg font-semibold text-white">Hapus Penerima?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Penerima akan dihapus dari monitoring Benar Foundation.
            </p>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-ghost btn-sm">Batal</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn btn-danger btn-sm">Hapus</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

function BulkImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [emailsText, setEmailsText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    found: Array<{ email: string; guid: string; name: string }>;
    notFound: string[];
  } | null>(null);

  const handleImport = async () => {
    const emails = emailsText
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/benar-foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, emails }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ inserted: 0, found: [], notFound: emails });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative bg-[#1c1c1f] border border-white/10 rounded-2xl w-full max-w-lg mx-4"
      >
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-semibold text-white">Import Email Penerima</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-zinc-400">
                Paste daftar email penerima dana (satu email per baris):
              </p>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                className="input-field w-full h-40 resize-none"
                placeholder={`theresiaesi80@gmail.com\ntante337@gmail.com\n...`}
              />
              <button
                onClick={handleImport}
                disabled={importing || !emailsText.trim()}
                className="btn btn-primary w-full"
              >
                {importing ? "Memproses..." : "Cocokkan & Import"}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-lime-500/10 border border-lime-500/20">
                <CheckCircle size={20} className="text-lime-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-lime-300">
                    {result.inserted} penerima berhasil ditambahkan
                  </p>
                  <p className="text-xs text-zinc-500">
                    {result.found.length} ditemukan, {result.notFound.length} tidak ditemukan
                  </p>
                </div>
              </div>

              {result.found.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Ditemukan:</p>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {result.found.map((f) => (
                      <div key={f.email} className="flex items-center gap-2 text-sm text-zinc-300 px-2">
                        <CheckCircle size={12} className="text-lime-500 shrink-0" />
                        <span className="truncate">{f.name || f.email}</span>
                        <span className="text-xs text-zinc-600 truncate">{f.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.notFound.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">Tidak ditemukan di sistem:</p>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {result.notFound.map((email) => (
                      <div key={email} className="flex items-center gap-2 text-sm text-red-400 px-2">
                        <AlertCircle size={12} className="shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={onImported} className="btn btn-primary w-full">
                Selesai
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
