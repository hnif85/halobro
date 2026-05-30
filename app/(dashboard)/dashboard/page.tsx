"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Send,
  Eye,
  MessageCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Activity,
  Zap,
  BarChart2,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCardSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface DashboardData {
  stats: {
    totalCustomers: number;
    sentToday: number;
    readRate: number;
    repliedRate: number;
  };
  recentCampaigns: Array<{
    id: number;
    name: string;
    message_type: string;
    status: string;
    created_at: string;
  }>;
  activity: Array<{
    id: number;
    phone_number: string;
    customer_name: string;
    send_status: string;
    sent_at: string;
    reply_text?: string;
  }>;
}

interface ActivityUser {
  guid: string;
  name: string;
  email: string;
  apps: Record<string, number>;
  total: number;
}

interface ActivityData {
  users: ActivityUser[];
  apps: string[];
  period: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(date: string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}d`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [activityPeriod, setActivityPeriod] = useState(30);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setTimeout(() => setLoading(false), 400));
  }, []);

  useEffect(() => {
    setActivityLoading(true);
    fetch(`/api/dashboard/user-activity?days=${activityPeriod}`)
      .then((r) => r.json())
      .then((d) => setActivityData(d))
      .catch(() => setActivityData(null))
      .finally(() => setActivityLoading(false));
  }, [activityPeriod]);

  const colMaxes: Record<string, number> = {};
  if (activityData?.apps) {
    for (const app of activityData.apps) {
      colMaxes[app] = (activityData?.users || []).reduce((max, u) => Math.max(max, u.apps[app] || 0), 0);
    }
  }

  const statCards = [
    { label: "Total Customers", value: data?.stats?.totalCustomers || 0, icon: <Users size={20} />, color: "violet" as const },
    { label: "Sent Today", value: data?.stats?.sentToday || 0, icon: <Send size={20} />, color: "lime" as const },
    { label: "Read Rate", value: data?.stats?.readRate || 0, suffix: "%", icon: <Eye size={20} />, color: "amber" as const },
    { label: "Replied Rate", value: data?.stats?.repliedRate || 0, suffix: "%", icon: <MessageCircle size={20} />, color: "red" as const },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {getGreeting()}, Admin
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary btn-sm">
          <Zap size={15} />
          New Campaign
        </Link>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              >
                <StatCard {...card} delay={i * 40} />
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Campaigns</h2>
            <Link href="/campaigns" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="card p-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer h-4 flex-1 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {(data?.recentCampaigns || []).map((campaign, i) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.22 }}
                    className="group"
                  >
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/4 rounded-xl transition-all duration-150 -mx-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                            {campaign.name}
                          </p>
                          <Badge
                            variant={getStatusBadgeVariant(campaign.status)}
                            dot
                            pulse={campaign.status === "sending"}
                          >
                            {getStatusLabel(campaign.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-zinc-500">
                            {campaign.message_type === "template" ? "Template" : "Text"}
                          </span>
                          <span className="text-xs text-zinc-600">·</span>
                          <span className="text-xs text-zinc-500">{formatDate(campaign.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={campaign.status === "done" ? 100 : campaign.status === "sending" ? 65 : 0} color="violet" size="sm" showLabel />
                        <ArrowRight size={14} className="text-zinc-600 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Activity</h2>
            <div className="flex items-center gap-1.5 text-xs text-lime-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500" />
              </span>
              Live
            </div>
          </div>

          <div className="card p-1">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="shimmer h-3 flex-1 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {(data?.activity || []).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.22 }}
                    className="flex items-start gap-3 px-3 py-3 hover:bg-white/4 rounded-xl transition-all duration-150"
                  >
                    <Avatar name={item.customer_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{item.customer_name}</p>
                        <Badge variant={getStatusBadgeVariant(item.send_status)} dot>
                          {getStatusLabel(item.send_status)}
                        </Badge>
                      </div>
                      {item.reply_text ? (
                        <p className="mt-1 text-xs text-lime-400/80 italic truncate">"{item.reply_text}"</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-zinc-500">{item.phone_number.replace(/^62/, "0")}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-xs text-zinc-600">
                      <Clock size={10} className="inline mr-0.5" />
                      {timeAgo(item.sent_at)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp size={15} className="text-violet-400" />
              Quick Stats
            </h3>
            {[
              { label: "Delivered", value: 98, total: 100, color: "lime" as const },
              { label: "Opened", value: 67, total: 100, color: "violet" as const },
              { label: "Replied", value: 23, total: 100, color: "amber" as const },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{item.label}</span>
                <div className="flex items-center gap-2 flex-1 ml-3">
                  <ProgressBar value={item.value} max={item.total} color={item.color} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Activity Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-lime-400" />
              Keaktifan Pengguna
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">Pemakaian kredit per aplikasi — {activityPeriod} hari terakhir</p>
          </div>
          <div className="flex gap-1">
            {[7, 30].map((d) => (
              <button
                key={d}
                onClick={() => setActivityPeriod(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  activityPeriod === d
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/8"
                }`}
              >
                {d}h
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          {activityLoading ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-white/6">
                <div className="shimmer h-3 w-32 rounded" />
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="shimmer h-3 w-16 rounded ml-auto" />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="shimmer h-3 w-36 rounded" />
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="shimmer h-3 w-16 rounded ml-auto" />
                  ))}
                </div>
              ))}
            </div>
          ) : !activityData || (activityData.users?.length ?? 0) === 0 ? (
            <div className="text-center py-14">
              <Activity size={32} className="mx-auto text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">Tidak ada aktivitas dalam {activityPeriod} hari terakhir</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="sticky left-0 bg-[#141416] px-4 py-3 text-left text-xs font-medium text-zinc-400 whitespace-nowrap min-w-[200px]">
                      Pengguna
                    </th>
                    {(activityData?.apps || []).map((app) => (
                      <th key={app} className="px-4 py-3 text-right text-xs font-medium text-zinc-400 whitespace-nowrap">
                        {app.length > 18 ? app.slice(0, 16) + "…" : app}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(activityData?.users || []).map((user, i) => {
                    const totalMax = activityData.users[0]?.total || 1;
                    const barWidth = (user.total / totalMax) * 100;
                    return (
                      <motion.tr
                        key={user.guid}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                        className="group hover:bg-white/3 transition-colors duration-100"
                      >
                        <td className="sticky left-0 bg-[#141416] group-hover:bg-[#1c1c1f] px-4 py-3 whitespace-nowrap transition-colors duration-100">
                          <div className="font-medium text-white truncate max-w-[180px]">{user.name}</div>
                          {user.email && (
                            <div className="text-xs text-zinc-500 truncate max-w-[180px]">{user.email}</div>
                          )}
                        </td>
                        {(activityData?.apps || []).map((app) => {
                          const value = user.apps[app] || 0;
                          const opacity = colMaxes[app] > 0 && value > 0 ? (value / colMaxes[app]) * 0.32 : 0;
                          return (
                            <td
                              key={app}
                              className="px-4 py-3 text-right tabular-nums"
                              style={{ backgroundColor: opacity > 0 ? `rgba(132, 204, 22, ${opacity})` : undefined }}
                            >
                              {value > 0 ? (
                                <span className="text-zinc-200 font-medium">{value.toLocaleString("id-ID")}</span>
                              ) : (
                                <span className="text-zinc-700">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 bg-white/8 rounded-full overflow-hidden flex-shrink-0">
                              <div
                                className="h-full bg-lime-500 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="font-semibold text-white tabular-nums text-xs min-w-[40px] text-right">
                              {user.total.toLocaleString("id-ID")}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {activityData.users.length === 50 && (
                <div className="px-4 py-2.5 text-xs text-zinc-500 border-t border-white/5 text-center">
                  Menampilkan 50 pengguna teratas berdasarkan total kredit
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}