"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { formatPhoneDisplay } from "@/lib/waba";

interface Customer {
  guid: string;
  full_name: string;
  phone_number: string;
  email: string;
  city: string;
  status: string;
  is_active: string;
  created_at: string;
  transaction_count?: number;
  total_spend?: number;
  app_registered?: number;
}

interface TrainingEvent {
  id: string;
  name: string;
  event_type: string;
  location: string;
  event_date: string;
  is_active: boolean;
}

interface DailyApp {
  appName: string;
  package: string | null;
  daily: Record<string, number>;
  total: number;
}

interface DailyData {
  dates: string[];
  apps: DailyApp[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [appNames, setAppNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterApp, setFilterApp] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [hasTx, setHasTx] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedGuid, setExpandedGuid] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, DailyData>>({});
  const [expandedLoading, setExpandedLoading] = useState<string | null>(null);
  const LIMIT = 20;

  useEffect(() => {
    fetch("/api/training-events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => {});
    fetch("/api/customers/app-names")
      .then((r) => r.json())
      .then((d) => setAppNames(d.appNames || []))
      .catch(() => {});
  }, []);

  function fetchCustomers(offset: number) {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterEvent) params.set("event_id", filterEvent);
    if (filterApp) params.set("app_name", filterApp);
    if (filterActive) params.set("active_days", filterActive);
    if (hasTx) params.set("has_transaction", "true");

    fetch(`/api/customers?${params}`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers || []))
      .catch(() => setCustomers([]))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }

  useEffect(() => {
    setPage(0);
    fetchCustomers(0);
  }, [search, filterStatus, filterEvent, filterApp, filterActive, hasTx]);

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setExpandedGuid(null);
    setExpandedData({});
    fetchCustomers(newPage * LIMIT);
  }

  function formatSpend(amount: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
  }

  function formatDate(date: string) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  function fmtDate(iso: string) {
    return iso.slice(8, 10) + "/" + iso.slice(5, 7);
  }

  function toggleExpand(guid: string) {
    if (expandedGuid === guid) {
      setExpandedGuid(null);
      return;
    }
    setExpandedGuid(guid);
    if (!expandedData[guid]) {
      setExpandedLoading(guid);
      fetch(`/api/customers/${guid}/app-usage/daily?days=30`)
        .then((r) => r.json())
        .then((d) => {
          setExpandedData((prev) => ({ ...prev, [guid]: d?.dates ? d : { dates: [], apps: [] } }));
        })
        .catch(() => {
          setExpandedData((prev) => ({ ...prev, [guid]: { dates: [], apps: [] } }));
        })
        .finally(() => setExpandedLoading(null));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Customers</h1>
        <p className="mt-1 text-sm text-zinc-500">Daftar semua customer dari CMS</p>
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

        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="input-field w-44"
        >
          <option value="">Semua Event</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>

        <select
          value={filterApp}
          onChange={(e) => setFilterApp(e.target.value)}
          className="input-field w-40"
        >
          <option value="">Semua Aplikasi</option>
          {appNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-field w-32"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
        </select>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="input-field w-40"
        >
          <option value="">Semua Aktivitas</option>
          <option value="7">Aktif 7 hari</option>
          <option value="30">Aktif 30 hari</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-zinc-400 whitespace-nowrap">
          <input
            type="checkbox"
            checked={hasTx}
            onChange={(e) => setHasTx(e.target.checked)}
            className="accent-violet-500"
          />
          Pernah beli
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {loading ? (
            <table className="w-full">
              <thead className="sticky top-0 bg-[#141416] z-10">
                <tr className="border-b border-white/7">
                  {["Nama", "No. HP", "Email", "Kota", "Status", "Aplikasi", "Transaksi", "Total Spend"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={8} />
                ))}
              </tbody>
            </table>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-zinc-400">Tidak ada customer</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-[#141416] z-10">
                <tr className="border-b border-white/7">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">No. HP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Kota</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Aplikasi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Transaksi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((customer, i) => (
                  <Fragment key={customer.guid}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-white/4 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/customers/${customer.guid}`} className="flex items-center gap-3">
                          <Avatar name={customer.full_name} size="sm" />
                          <span className="text-sm font-medium text-white hover:text-violet-300 transition-colors">
                            {customer.full_name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        <a
                          href={`https://wa.me/${customer.phone_number?.replace(/^62/, "62")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-lime-400 transition-colors"
                        >
                          {formatPhoneDisplay(customer.phone_number || "")}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 truncate max-w-[150px]">{customer.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{customer.city || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(customer.is_active || "inactive")}>
                          {customer.is_active === "active" || customer.status === "active" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleExpand(customer.guid)}
                          className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          <Package size={14} />
                          <span>{customer.app_registered || 0}</span>
                          {expandedGuid === customer.guid ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 text-center">
                        {customer.transaction_count || 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {customer.total_spend ? formatSpend(customer.total_spend) : "—"}
                      </td>
                    </motion.tr>
                    {expandedGuid === customer.guid && (
                      <tr className="bg-[#0d0d0f]">
                        <td colSpan={8} className="p-0">
                          {expandedLoading === customer.guid ? (
                            <div className="px-4 py-3 space-y-2">
                              <div className="flex gap-3 pb-2 border-b border-white/6">
                                <div className="shimmer h-3 w-28 rounded" />
                                {Array.from({ length: 6 }).map((_, j) => (
                                  <div key={j} className="shimmer h-3 w-10 rounded" />
                                ))}
                              </div>
                              {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex gap-3">
                                  <div className="shimmer h-3 w-28 rounded" />
                                  {Array.from({ length: 6 }).map((_, j) => (
                                    <div key={j} className="shimmer h-3 w-10 rounded" />
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : !expandedData[customer.guid] || (expandedData[customer.guid]?.apps?.length ?? 0) === 0 ? (
                            <p className="px-4 py-3 text-xs text-zinc-500">
                              Tidak ada aktivitas dalam 30 hari terakhir
                            </p>
                          ) : (
                            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-white/6">
                                    <th className="sticky left-0 bg-[#0d0d0f] px-4 py-2 text-left font-medium text-zinc-400 whitespace-nowrap min-w-[150px] z-10">
                                      Aplikasi
                                    </th>
                                    {(expandedData[customer.guid]?.dates || []).map((d) => (
                                      <th
                                        key={d}
                                        className="px-1.5 py-2 text-center font-medium text-zinc-600 whitespace-nowrap min-w-[40px]"
                                      >
                                        {fmtDate(d)}
                                      </th>
                                    ))}
                                    <th className="px-4 py-2 text-right font-medium text-zinc-400 whitespace-nowrap sticky right-0 bg-[#0d0d0f]">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/4">
                                  {(expandedData[customer.guid]?.apps || []).map((app) => {
                                    const maxDay = Object.values(app.daily).reduce(
                                      (m, v) => Math.max(m, v),
                                      0
                                    );
                                    return (
                                      <tr
                                        key={app.appName}
                                        className="hover:bg-white/3 transition-colors"
                                      >
                                        <td className="sticky left-0 bg-[#0d0d0f] px-4 py-2 whitespace-nowrap z-10">
                                          <span className="font-medium text-white">{app.appName}</span>
                                          {app.package && (
                                            <span className="ml-1.5 text-zinc-600 bg-white/5 px-1 py-0.5 rounded text-[10px]">
                                              {app.package}
                                            </span>
                                          )}
                                        </td>
                                        {(expandedData[customer.guid]?.dates || []).map((d) => {
                                          const value = app.daily[d] || 0;
                                          const opacity =
                                            maxDay > 0 && value > 0
                                              ? (value / maxDay) * 0.35
                                              : 0;
                                          return (
                                            <td
                                              key={d}
                                              className="px-1.5 py-2 text-center tabular-nums"
                                              style={{
                                                backgroundColor:
                                                  opacity > 0
                                                    ? `rgba(132, 204, 22, ${opacity})`
                                                    : undefined,
                                              }}
                                            >
                                              {value > 0 ? (
                                                <span className="text-zinc-200">
                                                  {value.toLocaleString("id-ID")}
                                                </span>
                                              ) : (
                                                <span className="text-zinc-800">—</span>
                                              )}
                                            </td>
                                          );
                                        })}
                                        <td className="px-4 py-2 text-right font-semibold text-lime-400 tabular-nums whitespace-nowrap sticky right-0 bg-[#0d0d0f]">
                                          {app.total.toLocaleString("id-ID")}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {customers.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/7">
            <button
              onClick={() => handlePageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-500">Page {page + 1}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={customers.length < LIMIT}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
