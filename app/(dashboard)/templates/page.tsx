"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Template {
  id: string;
  name: string;
  display_name: string;
  content: string;
  variables: Record<string, unknown>;
  damcorp_status: string;
  is_active: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function fetchTemplates() {
    setLoading(true);
    fetch("/api/templates?active_only=false")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 200));
  }

  useEffect(fetchTemplates, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/templates/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(`✓ ${data.processed} templates diproses (${data.inserted} baru, ${data.updated} update)`);
      fetchTemplates();
    } catch {
      setSyncResult("❌ Sync gagal");
    } finally {
      setSyncing(false);
    }
  }

  const approved = templates.filter((t) => t.damcorp_status === "APPROVED");
  const pending = templates.filter((t) => t.damcorp_status !== "APPROVED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Templates WA</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {templates.length} template ({approved.length} approved)
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync from Damcorp"}
        </button>
      </div>

      {syncResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-xl bg-lime-500/10 border border-lime-500/20 text-sm text-lime-300"
        >
          {syncResult}
        </motion.div>
      )}

      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">
          Approved ({approved.length})
        </h2>
        <div className="card divide-y divide-white/5">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shimmer h-10 rounded-lg" />
              ))}
            </div>
          ) : approved.length === 0 ? (
            <div className="p-6 text-center text-zinc-500 text-sm">
              Belum ada template. Klik "Sync from Damcorp".
            </div>
          ) : (
            approved.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.015 }}
                className="px-4 py-3 flex items-center gap-3 hover:bg-white/4 transition-colors"
              >
                <CheckCircle size={14} className="text-lime-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tpl.display_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{tpl.name}</p>
                </div>
                <Badge variant="lime">Approved</Badge>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">
            Pending / Other ({pending.length})
          </h2>
          <div className="card divide-y divide-white/5">
            {pending.map((tpl, i) => (
              <div key={tpl.id} className="px-4 py-3 flex items-center gap-3 hover:bg-white/4 transition-colors">
                <XCircle size={14} className="text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tpl.display_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{tpl.name}</p>
                </div>
                <Badge variant="amber">{tpl.damcorp_status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}