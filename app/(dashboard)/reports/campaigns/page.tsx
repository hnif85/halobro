"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Send, Eye, MessageCircle, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { ChartCard } from "@/components/reports/ChartCard";
import { FunnelBar } from "@/components/reports/FunnelBar";
import { ReportHeader } from "@/components/reports/ReportHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

interface CampaignReport {
  summary: { totalCampaigns: number; totalSent: number; totalDelivered: number; totalRead: number; totalReplied: number; avgReadRate: number; avgReplyRate: number };
  funnel: { sent: number; delivered: number; read: number; replied: number };
  templateComparison: { templateCount: number; textCount: number; templateAvgRead: number; templateAvgReply: number; textAvgRead: number; textAvgReply: number };
  bestPerformers: any[];
  worstPerformers: any[];
  weeklyTrend: { week: string; sent: number; delivered: number; read: number }[];
  campaigns: any[];
}

export default function CampaignReportPage() {
  const [data, setData] = useState<CampaignReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/campaigns?days=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [period]);

  const funnelSteps = data ? [
    { label: "Terkirim", value: data.funnel.sent, pct: 100, color: "#7c3aed" },
    { label: "Ter deliver", value: data.funnel.delivered, pct: data.funnel.sent > 0 ? Math.round((data.funnel.delivered / data.funnel.sent) * 100) : 0, color: "#84cc16" },
    { label: "Dibaca", value: data.funnel.read, pct: data.funnel.delivered > 0 ? Math.round((data.funnel.read / data.funnel.delivered) * 100) : 0, color: "#f59e0b" },
    { label: "Dibalas", value: data.funnel.replied, pct: data.funnel.delivered > 0 ? Math.round((data.funnel.replied / data.funnel.delivered) * 100) : 0, color: "#ef4444" },
  ] : [];

  const templateCompareData = data ? [
    { name: "Template", readRate: data.templateComparison.templateAvgRead, replyRate: data.templateComparison.templateAvgReply },
    { name: "Text", readRate: data.templateComparison.textAvgRead, replyRate: data.templateComparison.textAvgReply },
  ] : [];

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Campaign Performance"
        subtitle="Analisis mendalam performa campaign WhatsApp"
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="grid grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Total Campaign" value={data?.summary?.totalCampaigns || 0} icon={<Megaphone size={20} />} color="violet" />
            <StatCard label="Total Terkirim" value={data?.summary?.totalSent || 0} icon={<Send size={20} />} color="lime" />
            <StatCard label="Rata-rata Read Rate" value={data?.summary?.avgReadRate || 0} suffix="%" icon={<Eye size={20} />} color="amber" />
            <StatCard label="Rata-rata Reply Rate" value={data?.summary?.avgReplyRate || 0} suffix="%" icon={<MessageCircle size={20} />} color="red" />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Funnel Conversion" subtitle="Sent → Delivered → Read → Replied">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <FunnelBar steps={funnelSteps} total={data?.funnel.sent || 0} />
          )}
        </ChartCard>

        <ChartCard title="Template vs Text" subtitle="Perbandingan rata-rata read rate & reply rate">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={templateCompareData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                <Bar dataKey="readRate" name="Read Rate" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="replyRate" name="Reply Rate" fill="#84cc16" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ChartCard title="Weekly Trend" subtitle="Performa per minggu">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data?.weeklyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" tick={{ fill: "#a1a1aa", fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#f4f4f5" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }} />
                <Line type="monotone" dataKey="sent" name="Sent" stroke="#7c3aed" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#84cc16" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="read" name="Read" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Best & Worst Performers" subtitle="5 campaign dengan reply rate tertinggi & terendah">
          {loading ? <div className="shimmer h-48 rounded" /> : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-lime-400 flex items-center gap-1"><TrendingUp size={12} /> Terbaik</p>
              {(data?.bestPerformers || []).map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime-500/8">
                  <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                  <span className="text-xs text-zinc-200 truncate flex-1">{c.name}</span>
                  <span className="text-xs font-semibold text-lime-400 tabular-nums">{c.replyRate}%</span>
                </div>
              ))}
              <div className="border-t border-white/5 my-2" />
              <p className="text-xs font-medium text-red-400 flex items-center gap-1"><TrendingDown size={12} /> Terendah</p>
              {(data?.worstPerformers || []).map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/8">
                  <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                  <span className="text-xs text-zinc-200 truncate flex-1">{c.name}</span>
                  <span className="text-xs font-semibold text-red-400 tabular-nums">{c.replyRate}%</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
