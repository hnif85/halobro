"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, Clock, MapPin, ShoppingCart, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/reports/ChartCard";
import { ReportHeader } from "@/components/reports/ReportHeader";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

interface CustomerReport {
  summary: { totalCustomers: number; activeUsers: number; active: number; idle: number; passive: number; enrolledCount: number; withTransactions: number };
  cityDistribution: { city: string; count: number }[];
  monthlyTransactions: { month: string; total: number; count: number }[];
  topApps: { agent: string; users: number }[];
  segmentDistribution: { label: string; value: number; color: string }[];
}

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function CustomerReportPage() {
  const [data, setData] = useState<CustomerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/customers?days=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [period]);

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Customer Insights"
        subtitle="Segmentasi, distribusi, dan pola transaksi customer"
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Customer" value={data?.summary?.totalCustomers || 0} icon={<Users size={20} />} color="violet" />
            <StatCard label="Aktif" value={data?.summary?.active || 0} icon={<UserCheck size={20} />} color="lime" />
            <StatCard label="Idle" value={data?.summary?.idle || 0} icon={<Clock size={20} />} color="amber" />
            <StatCard label="Pasif" value={data?.summary?.passive || 0} icon={<UserX size={20} />} color="red" />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <ChartCard title="Segmentasi Customer" subtitle="Berdasarkan aktivitas pemakaian">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.segmentDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {(data?.segmentDistribution || []).map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                  formatter={(value: any) => [Number(value).toLocaleString("id-ID"), ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 text-xs">
            {data?.segmentDistribution.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-zinc-400">{s.label}</span>
                <span className="text-zinc-200 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Distribusi Kota" subtitle="10 kota dengan customer terbanyak">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {(data?.cityDistribution || []).slice(0, 10).map((c, i) => {
                const maxCount = data?.cityDistribution?.[0]?.count || 1;
                return (
                  <div key={c.city} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                    <span className="text-xs text-zinc-200 w-24 truncate">{c.city}</span>
                    <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all"
                        style={{ width: `${(c.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 tabular-nums w-10 text-right">{c.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Top Apps" subtitle="Aplikasi paling banyak digunakan">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {(data?.topApps || []).slice(0, 8).map((app, i) => {
                const maxUsers = data?.topApps?.[0]?.users || 1;
                return (
                  <div key={app.agent} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                    <span className="text-xs text-zinc-200 flex-1 truncate">{app.agent}</span>
                    <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-lime-500 rounded-full transition-all"
                        style={{ width: `${(app.users / maxUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 tabular-nums w-14 text-right">{app.users} user</span>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Transaksi per Bulan" subtitle="Total nilai & jumlah transaksi">
        {loading ? <div className="shimmer h-48 rounded" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.monthlyTransactions || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#f4f4f5" }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
              <Bar yAxisId="left" dataKey="total" name="Total (Rp)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="count" name="Jumlah Transaksi" fill="#84cc16" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
