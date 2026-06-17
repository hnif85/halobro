"use client";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Konfigurasi HaloBro CRM</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Damcorp WhatsApp</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Username</span>
            <span className="text-white font-mono">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Password</span>
            <span className="text-white font-mono">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Test Phone</span>
            <span className="text-white font-mono">••••••••</span>
          </div>
        </div>
        <p className="text-xs text-zinc-600">Kredensial Damcorp dikelola melalui environment variables.</p>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Webhook</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Verify Token</span>
            <span className="text-white font-mono">••••••••</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Endpoint</span>
            <span className="text-white font-mono">/api/webhook/damcorp</span>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-white">Halosis API</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Base URL</span>
            <span className="text-white font-mono">api.halosis.id</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Email</span>
            <span className="text-white font-mono">Dikonfigurasi via env</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-zinc-400">Status</span>
            <span className="text-emerald-400">Terkonfigurasi</span>
          </div>
        </div>
        <p className="text-xs text-zinc-600">
          Kredensial Halosis dikelola melalui <span className="font-mono text-zinc-500">HALOSIS_EMAIL</span> dan{" "}
          <span className="font-mono text-zinc-500">HALOSIS_PASSWORD</span> di file .env.local.
        </p>
      </div>
    </div>
  );
}