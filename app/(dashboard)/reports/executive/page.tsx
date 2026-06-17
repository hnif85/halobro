"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Send, Eye, MessageCircle, Megaphone, TrendingUp, BarChart3, Target } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/reports/ChartCard";
import { FunnelBar } from "@/components/reports/FunnelBar";
import { ReportHeader } from "@/components/reports/ReportHeader";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ExecutiveData {
  stats: { totalCustomers: number; totalCampaigns: number; templateCampaigns: number; textCampaigns: number };
  funnel: { sent: number; delivered: number; read: number; replied: number; deliveredRate: number; readRate: number; repliedRate: number };
  campaignTrend: { month: string; total: number }[];
  customerTrend: { month: string; total: number }[];
  topCampaigns: { id: number; name: string; message_type: string; status: string; created_at: string }[];
}

export default function ExecutiveReportPage() {
  const [data, setData] = useState<ExecutiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/executive?days=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [period]);

  const funnelSteps = data ? [
    { label: "Terkirim", value: data.funnel.sent, pct: 100, color: "#7c3aed" },
    { label: "Ter deliver", value: data.funnel.delivered, pct: data.funnel.deliveredRate, color: "#84cc16" },
    { label: "Dibaca", value: data.funnel.read, pct: data.funnel.readRate, color: "#f59e0b" },
    { label: "Dibalas", value: data.funnel.replied, pct: data.funnel.repliedRate, color: "#ef4444" },
  ] : [];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Executive Overview"
        subtitle="Ringkasan kinerja CRM secara keseluruhan"
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Customers" value={data?.stats?.totalCustomers || 0} icon={<Users size={20} />} color="violet" />
            <StatCard label="Total Campaigns" value={data?.stats?.totalCampaigns || 0} icon={<Megaphone size={20} />} color="lime" />
            <StatCard label="Templates" value={data?.stats?.templateCampaigns || 0} icon={<BarChart3 size={20} />} color="amber" />
            <StatCard label="Text Blast" value={data?.stats?.textCampaigns || 0} icon={<Target size={20} />} color="red" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Campaign Funnel" subtitle="Dari terkirim ke balasan">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <FunnelBar steps={funnelSteps} total={data?.funnel.sent || 0} />
          )}
        </ChartCard>

        <ChartCard title="Trend Campaign per Bulan" subtitle="Jumlah campaign per bulan">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.campaignTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Customer Growth" subtitle="Akumulasi customer per bulan">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.customerTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Line type="monotone" dataKey="total" stroke="#84cc16" strokeWidth={2} dot={{ fill: "#84cc16", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top Campaigns" subtitle="5 campaign terbaru">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <div className="space-y-2">
              {(data?.topCampaigns || []).slice(0, 5).map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors"
                >
                  <span className="text-xs text-zinc-600 w-4">{i + 1}.</span>
                  <span className="text-xs font-medium text-zinc-200 truncate flex-1">{c.name}</span>
                  <span className="text-xs text-zinc-500">{c.message_type === "template" ? "Template" : "Text"}</span>
                  <span className="text-xs text-zinc-600">{new Date(c.created_at).toLocaleDateString("id-ID")}</span>
                </motion.div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
