"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, getStatusBadgeVariant, getStatusLabel } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";

interface Customer {
  guid: string;
  full_name: string;
  phone_number: string;
  email: string;
  username?: string;
  city: string;
  status: string;
  is_active: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  display_name: string;
  content: string;
  variables: Record<string, unknown>;
  damcorp_status: string;
}

export default function NewCampaignPage() {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allChecked, setAllChecked] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [textBody, setTextBody] = useState("");
  const [messageType, setMessageType] = useState<"template" | "text">("template");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [hasTransaction, setHasTransaction] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingResult, setSendingResult] = useState<{ sent: number; failed: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/training-events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => {});
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplateList(d.templates || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterEvent, hasTransaction, search]);

  async function fetchCustomers() {
    setLoading(true);
    const params = new URLSearchParams({});
    if (search) params.set("search", search);
    if (filterStatus) params.set("status", filterStatus);
    if (filterEvent) params.set("event_id", filterEvent);
    if (hasTransaction) params.set("has_transaction", "true");

    try {
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
      setAllChecked(false);
    } else {
      setSelected(new Set(customers.map((c) => c.guid)));
      setAllChecked(true);
    }
  }

  function toggleOne(guid: string) {
    const next = new Set(selected);
    if (next.has(guid)) next.delete(guid);
    else next.add(guid);
    setSelected(next);
    setAllChecked(next.size === customers.length);
  }

  const filtered = customers.filter((c) =>
    (c.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone_number || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.username || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleSend() {
    if (selected.size === 0) return;
    setSending(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName || `Campaign ${new Date().toLocaleDateString("id-ID")}`,
          message_type: messageType,
          template_name: messageType === "template" ? templateName : undefined,
          text_body: messageType === "text" ? textBody : undefined,
          status: "draft",
        }),
      });

      const { campaign } = await res.json();

      if (campaign) {
        const sendRes = await fetch(`/api/campaigns/${campaign.id}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient_guids: Array.from(selected) }),
        });

        const result = await sendRes.json();
        setSendingResult({ sent: result.sent || 0, failed: result.failed || 0 });
        setStep(4);
      }
    } catch {
      setSendingResult({ sent: 0, failed: selected.size });
      setStep(4);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">New Campaign</h1>
        <p className="mt-1 text-sm text-zinc-500">Kirim broadcast WA ke customer kamu</p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                step > s
                  ? "bg-lime-500 text-white"
                  : step === s
                  ? "bg-violet-500 text-white"
                  : "bg-white/8 text-zinc-500"
              )}
            >
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && (
              <div className={cn("w-12 h-0.5 rounded-full transition-colors", step > s ? "bg-lime-500" : "bg-white/8")} />
            )}
          </div>
        ))}
        <div className="flex-1" />
        <span className="text-sm text-zinc-500">
          Step {step} of 4 —{" "}
          {step === 1 ? "Pilih Customer" : step === 2 ? "Template" : step === 3 ? "Review" : "Selesai"}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau nomor..."
                  className="input-field pl-9"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input-field w-36"
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className="input-field w-48"
              >
                <option value="">Semua Event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-zinc-400 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={hasTransaction}
                  onChange={(e) => setHasTransaction(e.target.checked)}
                  className="accent-violet-500"
                />
                pernah beli
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    allChecked ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {allChecked ? <CheckCircle size={16} /> : <Circle size={16} />}
                  Select All ({selected.size > 0 ? `${selected.size}/` : ""}{filtered.length})
                </button>
              </div>
              <span className="text-sm text-zinc-500">{filtered.length} customer match</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 shimmer h-12 rounded-lg" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-zinc-400">Tidak ada customer yang match</p>
                </div>
              ) : (
                <table className="w-full">
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((customer) => {
                      const isChecked = selected.has(customer.guid);
                      return (
                        <tr
                          key={customer.guid}
                          className={cn(
                            "hover:bg-white/4 transition-colors cursor-pointer",
                            isChecked && "bg-violet-500/5"
                          )}
                          onClick={() => toggleOne(customer.guid)}
                        >
                          <td className="px-4 py-3 w-10">
                            {isChecked ? (
                              <CheckCircle size={18} className="text-violet-400" />
                            ) : (
                              <Circle size={18} className="text-zinc-600" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={customer.full_name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-white">{customer.full_name}</p>
                                <p className="text-xs text-zinc-500">{customer.phone_number?.replace(/^62/, "0")}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={getStatusBadgeVariant(customer.status)}>
                              {getStatusLabel(customer.status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-500">{customer.city || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={selected.size === 0}
              className="btn btn-primary"
            >
              Lanjut — {selected.size} recipient
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-5 max-w-lg">
          <h2 className="text-lg font-semibold text-white">Pilih Template / Jenis Pesan</h2>
          <div className="flex gap-2">
            {(["template", "text"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setMessageType(type)}
                className={cn(
                  "flex-1 py-3 rounded-xl text-sm font-medium border transition-all",
                  messageType === type
                    ? "bg-violet-500/15 border-violet-500/30 text-white"
                    : "border-white/7 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {type === "template" ? "Template WA" : "Text Biasa"}
              </button>
            ))}
          </div>

          {messageType === "template" ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pilih Template WA</label>
              <select
                value={templateName}
                onChange={(e) => {
                  const tpl = templateList.find((t) => t.name === e.target.value);
                  setTemplateName(e.target.value);
                  setSelectedTemplate(tpl || null);
                  if (!campaignName && tpl) {
                    setCampaignName(tpl.display_name);
                  }
                }}
                className="input-field"
              >
                <option value="">— Pilih template —</option>
                {templateList.map((tpl) => (
                  <option key={tpl.id} value={tpl.name}>
                    {tpl.display_name} ({tpl.name})
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/7 text-sm">
                  <p className="text-xs text-zinc-500 mb-1">Preview:</p>
                  <p className="text-zinc-300 whitespace-pre-wrap line-clamp-4">
                    {selectedTemplate.content || "—"}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {selectedTemplate.damcorp_status === "APPROVED" ? (
                      <span className="text-lime-400">✓ Approved</span>
                    ) : (
                      <span className="text-amber-400">⏳ {selectedTemplate.damcorp_status}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Isi Pesan</label>
              <textarea
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                className="input-field resize-none"
                rows={5}
                placeholder="Ketik pesan WA kamu..."
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nama Campaign</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="input-field"
              placeholder="Otomatis dari template kalau kosong"
            />
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn btn-secondary">Kembali</button>
            <button onClick={() => setStep(3)} className="btn btn-primary">
              Review
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-5 max-w-lg">
          <h2 className="text-lg font-semibold text-white">Review Campaign</h2>

          <div className="space-y-3">
            {[
              { label: "Campaign", value: campaignName || `Campaign ${new Date().toLocaleDateString("id-ID")}` },
              { label: "Jenis Pesan", value: messageType === "template" ? `Template: ${templateName}` : "Text" },
              { label: "Penerima", value: `${selected.size} customer` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-sm text-zinc-500">{item.label}</span>
                <span className="text-sm font-medium text-white">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/7">
            <p className="text-xs text-zinc-500 mb-1">Preview Pesan</p>
            <p className="text-sm text-zinc-300">
              {messageType === "template"
                ? `{{1}} — Template: ${templateName || "pilih template"}`
                : textBody || "Ketik pesan kamu..."}
            </p>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="btn btn-secondary">Kembali</button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn btn-primary"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                  </svg>
                  Kirim ke {selected.size} Recipient
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-8 text-center max-w-lg mx-auto"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-white">Campaign Terkirim!</h2>
          <p className="mt-2 text-sm text-zinc-400">
            {sendingResult && (
              <>
                <span className="text-lime-400 font-semibold">{sendingResult.sent}</span> berhasil,
                <span className="text-red-400 font-semibold"> {sendingResult.failed}</span> gagal
              </>
            )}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <a href="/campaigns" className="btn btn-secondary">Lihat Campaign</a>
            <button onClick={() => { setStep(1); setSelected(new Set()); setSendingResult(null); }} className="btn btn-primary">
              Buat Lagi
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}