"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, ChevronDown, MapPin, CalendarDays, FileDown } from "lucide-react";
import { cn, APP_COLORS, formatCredit } from "@/lib/utils";

interface AppUserInfo {
  guid: string;
  name: string | null;
  email: string | null;
  credit: number;
  packages?: string[];
  lastUsedAt?: string | null;
}

interface AppInfo {
  name: string;
  users: number;
  credit: number;
  userList: AppUserInfo[];
  packages?: string[];
}

interface EventSide {
  userCount: number;
  totalCredit: number;
  usage: AppInfo[];
  purchases: AppInfo[];
}

interface EventData {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  totalEnrolled: number;
  activeUsers: number;
  beforeEvent: EventSide;
  onEvent: EventSide;
  afterEvent: EventSide;
}

interface EventActivityProps {
  events: EventData[];
  loading: boolean;
  onExport?: () => void;
  exporting?: boolean;
}

function UsageBreakdown({ apps, totalCredit, emptyLabel, totalLabel }: {
  apps: AppInfo[];
  totalCredit: number;
  emptyLabel?: string;
  totalLabel?: string;
}) {
  const maxUsers = Math.max(...apps.map((a) => a.users), 1);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  if (apps.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-zinc-600">{emptyLabel || "Tidak ada aktivitas"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-white/5">
        {apps.map((app) => {
          const color = APP_COLORS[app.name] || "#71717a";
          const barPct = Math.round((app.users / maxUsers) * 100);
          const isExpanded = expandedApp === app.name;
          return (
            <div key={app.name}>
              <button
                onClick={() =>
                  setExpandedApp(isExpanded ? null : app.name)
                }
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-zinc-400 flex-1 min-w-0 truncate">
                  {app.name}
                </span>
                {app.packages && app.packages.length > 0 && (
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">
                    {app.packages[0]}
                  </span>
                )}
                <div className="w-12 h-1 bg-white/8 rounded-full overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full opacity-70"
                    style={{ width: `${barPct}%`, background: color }}
                  />
                </div>
                <div className="flex flex-col items-end shrink-0 min-w-[70px]">
                  <span className="text-xs font-semibold text-white tabular-nums">
                    {app.users} org
                  </span>
                  <span className="text-[10px] text-zinc-600 tabular-nums">
                    {formatCredit(app.credit)}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                  className="text-zinc-700 shrink-0"
                >
                  <ChevronDown size={13} />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-white/5 border-t border-white/5">
                      {app.userList.map((u) => (
                        <div
                          key={u.guid}
                          className="flex items-center gap-3 px-4 py-2"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                            style={{
                              background: `${color}20`,
                              color: color,
                            }}
                          >
                            {(u.name || u.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate leading-tight">
                              {u.name || u.email || "Pengguna"}
                            </p>
                            {u.email && (
                              <p className="text-[10px] text-zinc-600 truncate leading-tight mt-0.5">
                                {u.email}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            {u.packages && u.packages.length > 0 && (
                              <span className="text-[10px] text-zinc-500 truncate max-w-[120px] leading-tight">
                                {u.packages[0]}
                              </span>
                            )}
                            <span className="text-xs text-zinc-400 tabular-nums">
                              {formatCredit(u.credit)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5">
        <span className="text-[11px] text-zinc-600">{totalLabel || "Total credit"}</span>
        <span className="text-xs font-bold text-white tabular-nums">
          {formatCredit(totalCredit)}
        </span>
      </div>
    </div>
  );
}

function EventSidePanel({ side }: { side: EventSide }) {
  const purchasesTotal = side.purchases.reduce((s, a) => s + a.credit, 0);

  return (
    <div>
      <div className="border-b border-white/5">
        <div className="px-4 py-2">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Pembelian</span>
        </div>
        <UsageBreakdown
          apps={side.purchases}
          totalCredit={purchasesTotal}
          emptyLabel="Tidak ada pembelian"
          totalLabel="Total pembelian"
        />
      </div>
      <div>
        <div className="px-4 py-2">
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Pemakaian</span>
        </div>
        <UsageBreakdown
          apps={side.usage}
          totalCredit={side.totalCredit}
          emptyLabel="Tidak ada pemakaian"
          totalLabel="Total pemakaian"
        />
      </div>
    </div>
  );
}

function EventCard({
  event,
  isOpen,
  onToggle,
}: {
  event: EventData;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const activeRate =
    event.totalEnrolled > 0
      ? Math.round((event.activeUsers / event.totalEnrolled) * 100)
      : 0;

  const rateColor =
    activeRate >= 60
      ? "#84cc16"
      : activeRate >= 30
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 overflow-hidden",
        isOpen
          ? "border-white/12 bg-[#141416]"
          : "border-white/7 bg-[#141416] hover:border-white/10"
      )}
    >
      {/* Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/20 shrink-0">
          <GraduationCap size={17} className="text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {event.name}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {event.event_date
                ? new Date(event.event_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </span>
            <span className="text-white/10">·</span>
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {event.location || "—"}
            </span>
            {event.event_type && (
              <>
                <span className="text-white/10">·</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    event.event_type === "Offline"
                      ? "bg-violet-500/10 text-violet-300"
                      : event.event_type === "Online"
                        ? "bg-blue-500/10 text-blue-300"
                        : "bg-lime-500/10 text-lime-300"
                  )}
                >
                  {event.event_type}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-white">
              {event.totalEnrolled}
            </p>
            <p className="text-[10px] text-zinc-600">Peserta</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-violet-400">
              {event.activeUsers}
            </p>
            <p className="text-[10px] text-zinc-600">Aktif</p>
          </div>
          <div className="flex flex-col items-end gap-1 min-w-[90px]">
            <div className="w-[90px] h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${activeRate}%`, background: rateColor }}
              />
            </div>
            <p className="text-[11px] font-semibold tabular-nums" style={{ color: rateColor }}>
              {activeRate}% activation
            </p>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="text-zinc-600 shrink-0"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {/* Detail */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/7 px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
                  breakdown penggunaan aplikasi
                </span>
                <div className="flex-1 h-px bg-white/6" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Sebelum Training */}
                <div className="rounded-xl border border-white/7 bg-[#1c1c1f] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">📁</span>
                      <span className="text-xs font-semibold text-white">
                        Sebelum Training
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      <strong className="text-white font-semibold">
                        {event.beforeEvent.userCount}
                      </strong>{" "}
                      pengguna
                    </span>
                  </div>
                  <EventSidePanel side={event.beforeEvent} />
                </div>

                {/* Hari Event */}
                <div className="rounded-xl border border-white/7 bg-[#1c1c1f] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">📅</span>
                      <span className="text-xs font-semibold text-white">
                        Hari Event
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      <strong className="text-white font-semibold">
                        {event.onEvent.userCount}
                      </strong>{" "}
                      pengguna
                    </span>
                  </div>
                  <EventSidePanel side={event.onEvent} />
                </div>

                {/* Setelah Training */}
                <div className="rounded-xl border border-white/7 bg-[#1c1c1f] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">📈</span>
                      <span className="text-xs font-semibold text-white">
                        Setelah Training
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      <strong className="text-white font-semibold">
                        {event.afterEvent.userCount}
                      </strong>{" "}
                      pengguna
                    </span>
                  </div>
                  <EventSidePanel side={event.afterEvent} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-xl border border-white/7 bg-[#141416] p-5">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="shimmer h-4 w-56 rounded" />
          <div className="shimmer h-3 w-40 rounded" />
        </div>
        <div className="flex items-center gap-6">
          <div className="shimmer h-8 w-10 rounded" />
          <div className="shimmer h-8 w-10 rounded" />
          <div className="shimmer h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function EventActivity({
  events,
  loading,
  onExport,
  exporting,
}: EventActivityProps) {
  const [openId, setOpenId] = useState<string | null>(
    events.length > 0 ? events[0].id : null
  );

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <GraduationCap size={22} className="text-violet-400" />
            Events
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Aktivitas penggunaan aplikasi peserta — hari event vs luar event
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExport && !loading && events.length > 0 && (
            <button
              onClick={onExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 bg-[#1c1c1f] border border-white/7 hover:border-violet-500/30 hover:text-violet-400 transition-colors disabled:opacity-50"
            >
              <FileDown size={13} />
              {exporting ? "Mengunduh..." : "Export Excel"}
            </button>
          )}
          <div className="px-2.5 py-1 rounded-md text-xs text-zinc-500 bg-[#1c1c1f] border border-white/7">
            {events.length} event
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/7 bg-[#141416] py-16 text-center">
          <GraduationCap size={36} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Belum ada data event</p>
          <p className="text-xs text-zinc-700 mt-1">
            Data event akan muncul setelah ada peserta yang terdaftar dan
            menggunakan aplikasi
          </p>
        </div>
      )}

      {/* Event List */}
      {!loading && events.length > 0 && (
        <div className="space-y-3">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              isOpen={openId === ev.id}
              onToggle={() => toggle(ev.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
