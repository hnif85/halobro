"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "violet" | "lime" | "amber" | "red";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color = "violet",
  size = "sm",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorMap = {
    violet: "bg-violet-500",
    lime: "bg-lime-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 bg-white/5 rounded-full overflow-hidden", size === "sm" ? "h-1.5" : "h-2.5")}>
        <motion.div
          className={cn("h-full rounded-full", colorMap[color])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-zinc-400 tabular-nums min-w-[3ch]">{Math.round(pct)}%</span>
      )}
    </div>
  );
}