"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Users, Activity, Calendar, CreditCard, Search, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface SupportedCustomer {
  guid: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  city: string | null;
  status: string | null;
  is_active: string | null;
  totalCredit: number;
  totalDebit: number;
  remaining: number;
  appCount: number;
  appNames: string[];
  lastActivity: string | null;
  eventCount: number;
  eventNames: string[];
  hasUsage: boolean;
  hasEvent: boolean;
  hasPaidPurchase: boolean;
  totalPembelian: number;
}

interface FilterOption {
  key: string;
  label: string;
  icon: typeof Activity;
}

const filters: FilterOption[] = [
  { key: "all", label: "Semua", icon: Users },
  { key: "usage", label: "Penggunaan", icon: Activity },
  { key: "event", label: "Event", icon: Calendar },
];

function formatRp(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export function SupportedTab() {
  const [customers, setCustomers] = useState<SupportedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback((f: string) => {
    setLoading(true);
    fetch(`/api/benar-foundation/supported?filter=${f}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.suggestions || []);
        setSelected(new Set());
      })
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(filter); }, [filter, fetchData]);

  const allEvents = [...new Set(customers.flatMap((c) => c.eventNames))].sort();

  const filteredByEvent = selectedEvent && filter === "event"
    ? customers.filter((c) => c.eventNames.includes(selectedEvent))
    : customers;

  const filtered = searchQuery
    ? filteredByEvent.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_number?.includes(searchQuery),
      )
    : filteredByEvent;

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.guid));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.guid)));
    }
  };

  const toggleOne = (guid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(guid)) next.delete(guid);
      else next.add(guid);
      return next;
    });
  };

  const addToBenar = async () => {
    const guids = [...selected];
    if (guids.length === 0) return;
    setAdding(true);
    try {
      await fetch("/api/benar-foundation/supported", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guids }),
      });
      setSelected(new Set());
      fetchData(filter);
    } catch {
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {filters.map((f) => {
            const active = filter === f.key;
            const count = f.key === "all"
              ? customers.length
              : customers.filter((c) => f.key === "usage" ? c.hasUsage : c.hasEvent).length;
            return (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setSelectedEvent(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  active
                    ? "bg-violet-500/20 border-violet-500/30 text-violet-300"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300 hover:border-white/10"
                }`}
              >
                <f.icon size={13} />
                {f.label}
                <span className="opacity-60 ml-0.5">{count}</span>
              </button>
            );
          })}
          {filter === "event" && allEvents.length > 0 && (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-[11px] text-zinc-600">Event:</span>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="input-field !py-1.5 !text-xs min-w-[140px]"
              >
                <option value="">Semua Event</option>
                {allEvents.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !py-1.5 !pl-8 !pr-3 !text-xs w-52"
              placeholder="Cari nama/email/phone..."
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20"
        >
          <div className="flex items-center gap-2">
            <Check size={14} className="text-violet-400" />
            <span className="text-xs text-violet-300">
              {selected.size} dari {filtered.length} user terpilih
            </span>
          </div>
          <button
            onClick={addToBenar}
            disabled={adding}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-lime-500/20 border border-lime-500/30 text-lime-300 hover:bg-lime-500/30 transition-colors disabled:opacity-50"
          >
            <Plus size={13} />
            {adding ? "Menambahkan..." : "Tambah ke Penerima"}
          </button>
        </motion.div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="w-10 px-4 py-3">
                  <button
                    onClick={toggleAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allSelected
                        ? "bg-violet-500 border-violet-500"
                        : selected.size > 0
                          ? "border-violet-500/50 bg-violet-500/20"
                          : "border-zinc-600 hover:border-zinc-500"
                    }`}
                  >
                    {allSelected && <Check size={10} className="text-white" />}
                  </button>
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Penerima</th>
                <th className="text-center text-xs font-medium text-zinc-500 px-4 py-3">App</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Sisa Credit</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Total Debit</th>
                <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">Event</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Pembelian</th>
                <th className="text-right text-xs font-medium text-zinc-500 px-4 py-3">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-3"><div className="shimmer h-4 w-4 rounded" /></td>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="shimmer h-4 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Activity size={32} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500 text-sm">
                      {filter !== "all"
                        ? `Tidak ada user dengan kriteria "${filter}"`
                        : "Belum ada penerima"}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((c, i) => {
                const isSelected = selected.has(c.guid);
                const days = daysSince(c.lastActivity);
                const statusLabel = days === null ? "Pasif" : days <= 7 ? "Aktif" : days <= 30 ? "Idle" : "Pasif";
                const statusVariant: "lime" | "amber" | "red" | "muted" =
                  days === null ? "red" : days <= 7 ? "lime" : days <= 30 ? "amber" : "red";

                return (
                  <tr
                    key={c.guid}
                    onClick={() => toggleOne(c.guid)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${
                      isSelected ? "bg-violet-500/5" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleOne(c.guid)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-violet-500 border-violet-500"
                            : "border-zinc-600 hover:border-zinc-500"
                        }`}
                      >
                        {isSelected && <Check size={10} className="text-white" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.full_name || ""} />
                        <div>
                          <p className="text-sm font-medium text-white">{c.full_name || "—"}</p>
                          <p className="text-xs text-zinc-500">{c.email || c.phone_number || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-zinc-300 tabular-nums">{c.appCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm tabular-nums ${c.remaining <= 0 ? "text-red-400" : c.remaining < 200 ? "text-amber-400" : "text-zinc-300"}`}>
                        {c.remaining.toLocaleString("id-ID")} cr
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-zinc-300 tabular-nums">
                        {c.totalDebit.toLocaleString("id-ID")} cr
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {c.eventNames.length > 0 ? (
                          c.eventNames.slice(0, 2).map((name) => (
                            <span key={name} className="text-[11px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 truncate max-w-[120px]">
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                        {c.eventNames.length > 2 && (
                          <span className="text-[11px] text-zinc-500">+{c.eventNames.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.hasPaidPurchase ? (
                        <span className="text-xs text-lime-400">{formatRp(c.totalPembelian)}</span>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={statusVariant} dot={statusLabel === "Aktif"}>
                        {statusLabel}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
