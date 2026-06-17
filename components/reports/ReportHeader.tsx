"use client";

import { motion } from "framer-motion";
import { Download } from "lucide-react";

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  period?: number;
  onPeriodChange?: (d: number) => void;
  onExport?: () => void;
}

export function ReportHeader({ title, subtitle, period, onPeriodChange, onExport }: ReportHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-end justify-between flex-wrap gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {period && onPeriodChange && (
          <div className="flex gap-1 card p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => onPeriodChange(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  period === d ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white hover:bg-white/8"
                }`}
              >
                {d}h
              </button>
            ))}
          </div>
        )}
        {onExport && (
          <button onClick={onExport} className="btn btn-secondary btn-sm">
            <Download size={14} />
            Export
          </button>
        )}
      </div>
    </motion.div>
  );
}
