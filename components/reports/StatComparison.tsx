"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatComparisonProps {
  label: string;
  before: number;
  after: number;
  format?: (n: number) => string;
  color?: "violet" | "lime" | "amber";
  delay?: number;
}

export function StatComparison({
  label,
  before,
  after,
  format = (n) => n.toLocaleString("id-ID"),
  color = "violet",
  delay = 0,
}: StatComparisonProps) {
  const pctChange = before > 0 ? Math.round(((after - before) / before) * 100) : after > 0 ? 100 : 0;
  const isUp = pctChange > 0;
  const isDown = pctChange < 0;

  const colorMap = {
    violet: "text-violet-400 bg-violet-500/15",
    lime: "text-lime-400 bg-lime-500/12",
    amber: "text-amber-400 bg-amber-500/12",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="card p-4 space-y-3"
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Sebelum</span>
            <span className="text-sm font-semibold text-zinc-300 tabular-nums">{format(before)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Sesudah</span>
            <span className="text-lg font-bold text-white tabular-nums">{format(after)}</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold tabular-nums", colorMap[color])}>
          {isUp ? <TrendingUp size={16} /> : isDown ? <TrendingDown size={16} /> : null}
          {pctChange >= 0 ? "+" : ""}{pctChange}%
        </div>
      </div>
    </motion.div>
  );
}
