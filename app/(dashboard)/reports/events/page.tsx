"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Users, TrendingUp, TrendingDown, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/reports/ChartCard";
import { ReportHeader } from "@/components/reports/ReportHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface EventReport {
  events: {
    id: number;
    name: string;
    event_date: string;
    location: string;
    event_type: string;
    totalEnrolled: number;
    activeUsers: number;
    beforeUsers: number;
    afterUsers: number;
    beforeUsage: number;
    afterUsage: number;
    uplift: number;
    userDetails: { guid: string; name: string; email: string; beforeCredit: number; afterCredit: number }[];
    appComparison: { app: string; before: number; after: number }[];
  }[];
}

function EventRow({ event, index }: { event: EventReport["events"][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors text-left"
      >
        {expanded ? <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" /> : <ChevronRight size={16} className="text-zinc-500 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">{event.name}</span>
            <Badge variant={event.uplift > 0 ? "lime" : event.uplift < 0 ? "red" : "muted"}>
              {event.uplift > 0 ? "+" : ""}{event.uplift}%
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-zinc-500">{new Date(event.event_date).toLocaleDateString("id-ID")}</span>
            {event.location && <><span className="text-xs text-zinc-600">·</span><span className="text-xs text-zinc-500">{event.location}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs tabular-nums">
          <div className="text-right">
            <div className="text-zinc-500">Enrolled</div>
            <div className="text-white font-medium">{event.totalEnrolled}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500">Aktif</div>
            <div className="text-white font-medium">{event.activeUsers}</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-500">Uplift</div>
            <div className={event.uplift > 0 ? "text-lime-400 font-medium" : "text-red-400 font-medium"}>
              {event.uplift > 0 ? "+" : ""}{event.uplift}%
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="border-t border-white/7 px-5 py-4 space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Sebelum Event</p>
              <p className="text-lg font-bold text-white tabular-nums">{event.beforeUsage.toLocaleString("id-ID")}</p>
              <p className="text-xs text-zinc-500">{event.beforeUsers} pengguna</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Sesudah Event</p>
              <p className="text-lg font-bold text-white tabular-nums">{event.afterUsage.toLocaleString("id-ID")}</p>
              <p className="text-xs text-zinc-500">{event.afterUsers} pengguna</p>
            </div>
            <div className={`rounded-lg p-3 ${event.uplift > 0 ? "bg-lime-500/10" : "bg-red-500/10"}`}>
              <p className="text-xs text-zinc-500">Dampak</p>
              <p className={`text-lg font-bold tabular-nums ${event.uplift > 0 ? "text-lime-400" : "text-red-400"}`}>
                {event.uplift > 0 ? "+" : ""}{event.uplift}%
              </p>
            </div>
          </div>

          {event.appComparison.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Pemakaian per Aplikasi</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={event.appComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="app" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#a1a1aa" }} />
                  <Bar dataKey="before" name="Sebelum" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="after" name="Sesudah" fill="#84cc16" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {event.userDetails.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 mb-2">Detail Pengguna</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-zinc-500 font-medium px-2 py-1.5">Nama</th>
                      <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Sebelum</th>
                      <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Sesudah</th>
                      <th className="text-right text-zinc-500 font-medium px-2 py-1.5">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {event.userDetails.slice(0, 10).map((u) => {
                      const change = u.beforeCredit > 0 ? Math.round(((u.afterCredit - u.beforeCredit) / u.beforeCredit) * 100) : 0;
                      return (
                        <tr key={u.guid} className="hover:bg-white/4 transition-colors">
                          <td className="px-2 py-1.5 text-zinc-200">{u.name}</td>
                          <td className="px-2 py-1.5 text-right text-zinc-400 tabular-nums">{u.beforeCredit.toLocaleString("id-ID")}</td>
                          <td className="px-2 py-1.5 text-right text-zinc-200 tabular-nums">{u.afterCredit.toLocaleString("id-ID")}</td>
                          <td className={`px-2 py-1.5 text-right tabular-nums ${change > 0 ? "text-lime-400" : change < 0 ? "text-red-400" : "text-zinc-500"}`}>
                            {change > 0 ? "+" : ""}{change}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function EventReportPage() {
  const [data, setData] = useState<EventReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/reports/events")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, []);

  const totalEnrolled = data?.events?.reduce((s, e) => s + e.totalEnrolled, 0) || 0;
  const totalActive = data?.events?.reduce((s, e) => s + e.activeUsers, 0) || 0;
  const avgUplift = data?.events?.length
    ? Math.round(data.events.reduce((s, e) => s + e.uplift, 0) / data.events.length)
    : 0;
  const positiveImpact = data?.events?.filter((e) => e.uplift > 0).length || 0;

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Event ROI Report"
        subtitle="Dampak training event terhadap aktivitas dan pemakaian customer"
      />

      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Event" value={data?.events?.length || 0} icon={<GraduationCap size={20} />} color="violet" />
            <StatCard label="Total Enrolled" value={totalEnrolled} icon={<Users size={20} />} color="lime" />
            <StatCard label="Rata-rata Uplift" value={avgUplift} suffix="%" icon={<BarChart3 size={20} />} color="amber" />
            <StatCard label="Event Positif" value={positiveImpact} icon={<TrendingUp size={20} />} color="lime" />
          </>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <GraduationCap size={18} className="text-violet-400" />
          Detail Event
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-16 rounded-xl" />)}
          </div>
        ) : data?.events?.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap size={32} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-500">Belum ada data event</p>
          </div>
        ) : (
          data?.events.map((event, i) => <EventRow key={event.id} event={event} index={i} />)
        )}
      </div>
    </div>
  );
}
