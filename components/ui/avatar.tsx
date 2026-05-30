"use client";

import { cn } from "@/lib/utils";

interface AvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashColor(name?: string): string {
  if (!name) return "#7c3aed";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#7c3aed", "#84cc16", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
  };

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: hashColor(name) + "33", border: `1.5px solid ${hashColor(name)}44` }}
    >
      <span style={{ color: hashColor(name) }}>{getInitials(name)}</span>
    </div>
  );
}