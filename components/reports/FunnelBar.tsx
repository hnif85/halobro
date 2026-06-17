"use client";

import { motion } from "framer-motion";

interface FunnelStep {
  label: string;
  value: number;
  pct: number;
  color: string;
}

interface FunnelBarProps {
  steps: FunnelStep[];
  total: number;
}

export function FunnelBar({ steps, total }: FunnelBarProps) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const prevPct = i > 0 ? steps[i - 1].pct : 100;
        const dropOff = prevPct > 0 ? ((prevPct - step.pct) / prevPct) * 100 : 0;
        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: step.color }}
                />
                <span className="text-xs font-medium text-zinc-300">{step.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 tabular-nums">{step.value.toLocaleString("id-ID")}</span>
                <span className="text-xs font-semibold text-white tabular-nums w-12 text-right">{step.pct}%</span>
                {i > 0 && (
                  <span className="text-xs text-red-400/70 tabular-nums w-12 text-right">
                    {dropOff > 0 ? `-${Math.round(dropOff)}%` : "—"}
                  </span>
                )}
              </div>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${step.pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.23, 1, 0.32, 1] }}
                className="h-full rounded-full"
                style={{ backgroundColor: step.color }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-1 text-xs text-zinc-500 text-center tabular-nums">
        Total: {total.toLocaleString("id-ID")} penerima
      </div>
    </div>
  );
}
