"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Webhook } from "lucide-react";

const samplePayloads = {
  incoming_text: {
    object: "whatsapp_business_account",
    entry: [{
      id: "305490440128441",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "6281119591333", phone_number_id: "106540352242922" },
          contacts: [{ profile: { name: "Pelanggan" }, wa_id: "6285172101384" }],
          messages: [{
            from: "6285172101384",
            id: "wamid.simulasi." + Date.now(),
            type: "text",
            text: { body: "Halo, saya tertarik dengan promo ini!" }
          }]
        },
        field: "messages"
      }]
    }]
  },
  status_delivered: {
    object: "whatsapp_business_account",
    entry: [{
      id: "305490440128441",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "6281119591333", phone_number_id: "106540352242922" },
          statuses: [{
            id: "wamid.test",
            status: "delivered",
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: "6285172101384"
          }]
        },
        field: "messages"
      }]
    }]
  },
  status_read: {
    object: "whatsapp_business_account",
    entry: [{
      id: "305490440128441",
      changes: [{
        value: {
          messaging_product: "whatsapp",
          metadata: { display_phone_number: "6281119591333", phone_number_id: "106540352242922" },
          statuses: [{
            id: "wamid.test",
            status: "read",
            timestamp: Math.floor(Date.now() / 1000).toString(),
            recipient_id: "6285172101384"
          }]
        },
        field: "messages"
      }]
    }]
  },
};

export default function WebhookDebugPage() {
  const [payloadKey, setPayloadKey] = useState<string>("incoming_text");
  const [customFrom, setCustomFrom] = useState("6285172101384");
  const [customText, setCustomText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    setResult(null);

    const base = samplePayloads[payloadKey as keyof typeof samplePayloads];
    const payload = JSON.parse(JSON.stringify(base));

    // Customize if incoming text
    if (payloadKey === "incoming_text") {
      const msg = payload.entry[0].changes[0].value.messages[0];
      msg.from = customFrom;
      if (customText) msg.text.body = customText;
      msg.id = "wamid.simulasi." + Date.now();
    }

    try {
      const res = await fetch("/api/webhook/damcorp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      setResult(`HTTP ${res.status}\n${text}`);
    } catch (err) {
      setResult(`Error: ${String(err)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Webhook Debug</h1>
        <p className="mt-1 text-sm text-zinc-500">Simulasi incoming webhook dari Damcorp</p>
      </div>

      <div className="card p-6 space-y-5">
        <div className="space-y-3">
          <label className="block text-xs font-medium text-zinc-400">Event Type</label>
          <div className="flex gap-2">
            {Object.keys(samplePayloads).map((key) => (
              <button
                key={key}
                onClick={() => setPayloadKey(key)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                  payloadKey === key
                    ? "bg-violet-500/15 border-violet-500/30 text-white"
                    : "border-white/7 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {key === "incoming_text" ? "📩 Incoming Text" : key === "status_delivered" ? "✅ Delivered" : "👁️ Read"}
              </button>
            ))}
          </div>
        </div>

        {payloadKey === "incoming_text" && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Dari Nomor</label>
              <input
                type="text"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="input-field"
                placeholder="6285172101384"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pesan</label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="input-field resize-none"
                rows={3}
                placeholder="Halo, saya tertarik!"
              />
            </div>
          </div>
        )}

        <button onClick={handleSend} disabled={sending} className="btn btn-primary">
          <Send size={15} />
          {sending ? "Sending..." : "Kirim ke Webhook"}
        </button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{result}</pre>
          </motion.div>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Webhook size={15} className="text-violet-400" />
          Setup Webhook Real
        </h3>
        <p className="text-sm text-zinc-400">
          Untuk menerima pesan real dari customer, Damcorp perlu mengirim webhook ke URL publik.
        </p>
        <div className="p-3 rounded-xl bg-white/5 border border-white/7 text-sm space-y-2">
          <p className="text-zinc-300">
            <span className="text-violet-400 font-medium">1.</span> Install ngrok:
            <code className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded">npm install -g ngrok</code>
          </p>
          <p className="text-zinc-300">
            <span className="text-violet-400 font-medium">2.</span> Jalankan:
            <code className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded">ngrok http 3000</code>
          </p>
          <p className="text-zinc-300">
            <span className="text-violet-400 font-medium">3.</span> Copy URL ngrok (https://xxx.ngrok.io) ke panel Damcorp → Webhook → 
            <code className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded">https://xxx.ngrok.io/api/webhook/damcorp</code>
          </p>
        </div>
      </div>
    </div>
  );
}