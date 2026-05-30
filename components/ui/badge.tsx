"use client";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "violet" | "lime" | "amber" | "red" | "muted";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, variant = "default", dot = false, pulse = false, className }: BadgeProps) {
  const variantMap: Record<BadgeVariant, string> = {
    default: "bg-white/8 text-zinc-300 border-white/10",
    violet: "bg-violet-500/15 text-violet-300 border-violet-500/25",
    lime: "bg-lime-500/12 text-lime-300 border-lime-500/20",
    amber: "bg-amber-500/12 text-amber-300 border-amber-500/20",
    red: "bg-red-500/12 text-red-300 border-red-500/20",
    muted: "bg-white/5 text-zinc-500 border-white/8",
  };

  const dotColorMap: Record<BadgeVariant, string> = {
    default: "bg-zinc-400",
    violet: "bg-violet-400",
    lime: "bg-lime-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
    muted: "bg-zinc-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantMap[variant],
        className
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", dotColorMap[variant])}
            />
          )}
          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", dotColorMap[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}

export function getStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    draft: "muted",
    pending: "amber",
    sending: "violet",
    done: "lime",
    failed: "red",
    sent: "violet",
    delivered: "lime",
    read: "lime",
    replied: "lime",
    active: "lime",
    inactive: "muted",
    paid: "lime",
    refunded: "red",
  };
  return map[status] || "default";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    sending: "Sending",
    done: "Selesai",
    failed: "Gagal",
    sent: "Terkirim",
    delivered: "Diterima",
    read: "Dibaca",
    replied: "Dibalas",
    active: "Aktif",
    inactive: "Nonaktif",
    paid: "Lunas",
    refunded: "Dikembalikan",
  };
  return map[status] || status;
}