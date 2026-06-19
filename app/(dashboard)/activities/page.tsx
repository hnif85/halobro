"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, MessageSquare, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PipelineActivity {
  id: string;
  customer_guid: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  segmen: string;
  status: string;
  tier: string | null;
  priority: string | null;
  last_contact_at: string | null;
  created_at: string | null;
  last_message: string | null;
  last_message_direction: string | null;
  last_message_at: string | null;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatPhone(phone: string) {
  if (!phone) return "—";
  return phone.replace(/^62/, "0");
}

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-500/10 text-blue-400",
  Open: "bg-emerald-500/10 text-emerald-400",
  Pending: "bg-amber-500/10 text-amber-400",
  Closed: "bg-zinc-500/10 text-zinc-400",
};

const DIRECTION_LABELS: Record<string, string> = {
  inbound: "Masuk",
  outbound: "Keluar",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<PipelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [segments, setSegments] = useState<string[]>([]);
  const [selectedSegmen, setSelectedSegmen] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const fetchActivities = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String((page - 1) * LIMIT) });
    if (selectedSegmen) params.set("segmen", selectedSegmen);
    if (search) params.set("search", search);

    fetch(`/api/activities?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setActivities(d.activities || []);
        setSegments(d.segments || []);
        setTotal(d.total || 0);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, [page, selectedSegmen, search]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  useEffect(() => { setPage(1); }, [selectedSegmen, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Activities</h1>
        <p className="mt-1 text-sm text-zinc-500">Aktivitas pipeline per customer berdasarkan jenis</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor, email..."
            className="input-field pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-zinc-500" />
          <select
            value={selectedSegmen}
            onChange={(e) => setSelectedSegmen(e.target.value)}
            className="input-field w-40"
          >
            <option value="">Semua Segmen</option>
            {segments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="sticky top-0 bg-[#141416] z-10">
            <tr className="border-b border-white/7">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Segmen</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Pesan Terakhir</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">Kontak Terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <MessageSquare size={32} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500 text-sm">
                    {selectedSegmen ? `Tidak ada aktivitas dengan segmen "${selectedSegmen}"` : "Belum ada aktivitas pipeline"}
                  </p>
                </td>
              </tr>
            ) : (
              activities.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-white/4 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{a.customer_name || a.customer_phone || "—"}</p>
                      <p className="text-xs text-zinc-500">{a.customer_phone ? formatPhone(a.customer_phone) : a.customer_email || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-300">{a.segmen}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn(STATUS_COLORS[a.status || ""])}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 max-w-[300px]">
                    {a.last_message ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-zinc-300 truncate max-w-[250px]">{a.last_message}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-[10px] px-1 py-0 rounded",
                            a.last_message_direction === "outbound"
                              ? "bg-violet-500/10 text-violet-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          )}>
                            {DIRECTION_LABELS[a.last_message_direction || ""] || a.last_message_direction}
                          </span>
                          <span className="text-[10px] text-zinc-600">{formatDate(a.last_message_at)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-zinc-400">{formatDate(a.last_contact_at)}</span>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
              className="btn btn-secondary btn-sm"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-sm text-zinc-500">Hal {page}/{totalPages}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
