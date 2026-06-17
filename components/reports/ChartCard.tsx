"use client";

import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  delay?: number;
}

export function ChartCard({ title, subtitle, children, className, action, delay = 0 }: ChartCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={mounted ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className={cn("card p-5 space-y-4", className)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </motion.div>
  );
}
