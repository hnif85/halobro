"use client";

import { cn } from "@/lib/utils";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "recipients", label: "Recipients" },
  { id: "performance", label: "Performance" },
];

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export function Tabs({ activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-white/5 rounded-xl border border-white/7", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
            activeTab === tab.id
              ? "bg-violet-500/20 text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}