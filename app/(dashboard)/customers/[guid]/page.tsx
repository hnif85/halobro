"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, MessageSquare, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { formatPhoneDisplay } from "@/lib/waba";

interface Profile {
  guid: string;
  full_name: string;
  email: string;
  phone_number: string;
  city: string;
  country: string;
  status: string;
  is_active: string;
  gender: string;
  birth_date: string;
  created_at: string;
  subscribe_list: unknown;
}

interface Transaction {
  guid: string;
  invoice_number: string;
  status: string;
  grand_total: number;
  payment_channel_name: string;
  created_at: string;
  transaction_details?: Array<{
    product_name: string;
    product_price: number;
    qty: number;
    grand_total: number;
  }>;
}

interface CampaignHistory {
  id: number;
  campaign_name: string;
  send_status: string;
  sent_at: string;
  replied_at: string;
  reply_text: string;
}

function formatDate(date: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatSpend(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(amount);
}

export default function CustomerDetailPage() {
  const params = useParams();
  const guid = params.guid as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [campaignHistory, setCampaignHistory] = useState<CampaignHistory[]>([]);
  const [summary, setSummary] = useState({ totalSpend: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${guid}`)
      .then((r) => r.json())
      .then((d) => {
        setProfile(d.profile);
        setTransactions(d.transactions || []);
        setCampaignHistory(d.campaignHistory || []);
        setSummary(d.summary || { totalSpend: 0, totalOrders: 0 });
      })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 300));
  }, [guid]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-6 w-32 rounded" />
        <div className="card p-6">
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="shimmer h-4 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400">Customer tidak ditemukan</p>
        <Link href="/customers" className="mt-4 btn btn-secondary btn-sm inline-block">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="p-2 rounded-xl hover:bg-white/8 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name} size="lg" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">{profile.full_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <a
                href={`https://wa.me/${profile.phone_number?.replace(/^62/, "62")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors"
              >
                <Phone size={11} />
                {formatPhoneDisplay(profile.phone_number || "")}
              </a>
              <Badge variant={getStatusBadgeVariant(profile.is_active || "inactive")}>
                {profile.is_active === "active" ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {campaignHistory.length > 0 && (
            <div className="card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-violet-400" />
                Riwayat Campaign
              </h2>
              <div className="divide-y divide-white/5">
                {campaignHistory.map((h) => (
                  <div key={h.id} className="flex items-start justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{h.campaign_name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{formatDate(h.sent_at)}</p>
                      {h.reply_text && (
                        <p className="text-xs text-lime-400/80 mt-1 italic">"{h.reply_text}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(h.send_status)} dot>
                        {getStatusLabel(h.send_status)}
                      </Badge>
                      {h.replied_at && (
                        <span className="text-xs text-zinc-600">{timeAgo(h.replied_at)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transactions.length > 0 && (
            <div className="card overflow-hidden">
              <div className="p-5 border-b border-white/7">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShoppingCart size={18} className="text-violet-400" />
                  Riwayat Pembelian
                </h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#141416] z-10">
                    <tr className="border-b border-white/7">
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Tanggal</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Items</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map((tx) => (
                      <tr key={tx.guid} className="hover:bg-white/4 transition-colors">
                        <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{tx.invoice_number || "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(tx.created_at)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {tx.transaction_details?.[0]?.product_name || "—"}
                          {(tx.transaction_details?.length || 0) > 1 && (
                            <span className="text-zinc-600"> +{tx.transaction_details!.length - 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-white">{formatSpend(Number(tx.grand_total) || 0)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(tx.status)}>
                            {getStatusLabel(tx.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {campaignHistory.length === 0 && transactions.length === 0 && (
            <div className="card p-8 text-center">
              <p className="text-zinc-500">Belum ada history campaign atau transaksi</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Info Profile</h3>
            {[
              { label: "Nama Lengkap", value: profile.full_name },
              { label: "Email", value: profile.email || "—" },
              { label: "No. HP", value: formatPhoneDisplay(profile.phone_number || "") },
              { label: "Kota", value: profile.city || "—" },
              { label: "Negara", value: profile.country || "—" },
              { label: "Gender", value: profile.gender || "—" },
              { label: "Tgl Lahir", value: formatDate(profile.birth_date) },
              { label: "Terdaftar", value: formatDate(profile.created_at) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">{item.label}</span>
                <span className="text-white font-medium text-right">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Ringkasan Belanja</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/7 text-center">
                <p className="text-2xl font-bold text-white">{summary.totalOrders}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Total Pesanan</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/7 text-center">
                <p className="text-2xl font-bold text-lime-400">{formatSpend(summary.totalSpend)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">Total Spend</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(date: string) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}d`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}