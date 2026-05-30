"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Filter, Search, Users, Send, Eye } from "lucide-react";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: number;
  name: string;
  message_type: string;
  status: string;
  created_at: string;
  template_name?: string;
  text_body?: string;
  _stats?: { total: number; sent: number; read: number };
}

const statusFilters = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sending", label: "Sending" },
  { id: "done", label: "Selesai" },
  { id: "failed", label: "Gagal" },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);

    fetch(`/api/campaigns?${params}`)
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [filter]);

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-zinc-500">Kelola dan pantau semua campaign WA</p>
        </div>
        <Link href="/campaigns/new" className="btn btn-primary btn-sm">
          <Plus size={15} />
          New Campaign
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari campaign..."
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/7">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filter === f.id
                  ? "bg-violet-500/20 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/7">
                {["Campaign", "Type", "Status", "Recipients", "Sent", "Read", "Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={7} />
              ))}
            </tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 text-4xl">📭</div>
            <p className="text-zinc-400 font-medium">Belum ada campaign</p>
            <p className="mt-1 text-sm text-zinc-600">Buat campaign pertama kamu</p>
            <Link href="/campaigns/new" className="mt-4 btn btn-primary btn-sm">
              <Plus size={14} /> Buat Campaign
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/7">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">
                  <Users size={12} className="inline mr-1" />Recipients
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">
                  <Send size={12} className="inline mr-1" />Sent
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">
                  <Eye size={12} className="inline mr-1" />Read
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((campaign, i) => {
                const stats = campaign._stats || { total: 0, sent: 0, read: 0 };
                return (
                  <motion.tr
                    key={campaign.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-white/4 transition-colors duration-150 cursor-pointer"
                    onClick={() => window.location.href = `/campaigns/${campaign.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-white transition-colors">
                        {campaign.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500">
                        {campaign.message_type === "template" ? "Template" : "Text"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusBadgeVariant(campaign.status)} dot pulse={campaign.status === "sending"}>
                        {getStatusLabel(campaign.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold tabular-nums text-white">{stats.total}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold tabular-nums text-lime-400">{stats.sent}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold tabular-nums text-amber-400">{stats.read}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(campaign.created_at)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}