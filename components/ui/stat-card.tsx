"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color?: "violet" | "lime" | "amber" | "red";
  delay?: number;
}

export function StatCard({ label, value, suffix, icon, color = "violet", delay = 0 }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const start = performance.now();
      const duration = 700;

      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(eased * value));
        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, delay]);

  const colorMap = {
    violet: "from-violet-500/15 to-violet-600/5 border-violet-500/20",
    lime: "from-lime-500/12 to-lime-600/5 border-lime-500/20",
    amber: "from-amber-500/12 to-amber-600/5 border-amber-500/20",
    red: "from-red-500/12 to-red-600/5 border-red-500/20",
  };

  const iconColorMap = {
    violet: "text-violet-400",
    lime: "text-lime-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 border transition-all duration-300",
        "opacity-0 translate-y-3",
        mounted && "opacity-100 translate-y-0",
        colorMap[color]
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-white">
            {displayed.toLocaleString("id-ID")}
            {suffix && <span className="text-lg ml-1 text-zinc-400">{suffix}</span>}
          </p>
        </div>
        <div className={cn("mt-1 p-2.5 rounded-xl bg-white/5", iconColorMap[color])}>
          {icon}
        </div>
      </div>
      <div className="mt-4 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", mounted && "opacity-100", !mounted && "opacity-0",
            color === "violet" && "bg-violet-500",
            color === "lime" && "bg-lime-500",
            color === "amber" && "bg-amber-500",
            color === "red" && "bg-red-500"
          )}
          style={{
            width: `${Math.min((displayed / Math.max(value, 1)) * 100, 100)}%`,
            transition: `width ${700}ms cubic-bezier(0.23, 1, 0.32, 1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}