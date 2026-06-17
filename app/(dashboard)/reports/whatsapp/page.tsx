"use client";

import { useEffect, useState } from "react";
import { Send, Eye, MessageCircle, Clock, TrendingUp, BarChart3, MessageSquare } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/reports/ChartCard";
import { ReportHeader } from "@/components/reports/ReportHeader";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface WhatsAppReport {
  summary: { totalSent: number; delivered: number; read: number; replied: number; deliveryRate: number; readRate: number; replyRate: number; avgResponseTime: number };
  dailyTrend: { date: string; sent: number; delivered: number; read: number }[];
  hourlyDistribution: { hour: string; count: number }[];
  providerComparison: { damcorp: number; halosis: number; waMessages: number };
}

export default function WhatsAppReportPage() {
  const [data, setData] = useState<WhatsAppReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/whatsapp?days=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [period]);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="WhatsApp Channel Performance"
        subtitle="Analisis performa pengiriman pesan WhatsApp"
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Terkirim" value={data?.summary?.totalSent || 0} icon={<Send size={20} />} color="violet" />
            <StatCard label="Delivery Rate" value={data?.summary?.deliveryRate || 0} suffix="%" icon={<MessageSquare size={20} />} color="lime" />
            <StatCard label="Read Rate" value={data?.summary?.readRate || 0} suffix="%" icon={<Eye size={20} />} color="amber" />
            <StatCard label="Reply Rate" value={data?.summary?.replyRate || 0} suffix="%" icon={<MessageCircle size={20} />} color="red" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Volume Harian" subtitle="Sent · Delivered · Read per hari">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                <Area type="monotone" dataKey="sent" name="Sent" stackId="1" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.3} />
                <Area type="monotone" dataKey="delivered" name="Delivered" stackId="2" stroke="#84cc16" fill="#84cc16" fillOpacity={0.3} />
                <Area type="monotone" dataKey="read" name="Read" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Jam Pengiriman" subtitle="Distribusi jam kirim tersibuk">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.hourlyDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Bar dataKey="count" name="Pesan" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <ChartCard title="Response Time" subtitle="Rata-rata waktu balas">
          {loading ? <div className="shimmer h-24 rounded" /> : (
            <div className="flex flex-col items-center justify-center py-4">
              <Clock size={32} className="text-amber-400 mb-2" />
              <p className="text-4xl font-bold text-white tabular-nums">
                {data?.summary?.avgResponseTime || 0}
              </p>
              <p className="text-sm text-zinc-500 mt-1">jam rata-rata</p>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Provider Volume" subtitle="Damcorp vs Halosis">
          {loading ? <div className="shimmer h-24 rounded" /> : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Damcorp WABA</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{
                        width: `${data ? (data.providerComparison.damcorp / Math.max(data.providerComparison.damcorp, data.providerComparison.halosis, 1)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums w-16 text-right">
                    {data?.providerComparison.damcorp.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Halosis</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-lime-500 rounded-full"
                      style={{
                        width: `${data ? (data.providerComparison.halosis / Math.max(data.providerComparison.damcorp, data.providerComparison.halosis, 1)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums w-16 text-right">
                    {data?.providerComparison.halosis.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Delivery Funnel" subtitle="Ringkasan cepat">
          {loading ? <div className="shimmer h-24 rounded" /> : (
            <div className="space-y-2 py-2">
              {[
                { label: "Delivered", value: data?.summary?.deliveryRate || 0, color: "#84cc16" },
                { label: "Read", value: data?.summary?.readRate || 0, color: "#f59e0b" },
                { label: "Replied", value: data?.summary?.replyRate || 0, color: "#ef4444" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-16">{item.label}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white tabular-nums w-10 text-right">{item.value}%</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
