"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  GraduationCap,
  Heart,
  MessageSquare,
  Settings,
  Activity,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroup {
  label: string;
  icon: typeof Heart;
  children: { href: string; label: string }[];
}

interface NavLink {
  href: string;
  icon: typeof Heart;
  label: string;
}

type NavItem = NavLink | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
  {
    label: "Reports",
    icon: BarChart3,
    children: [
      { href: "/reports/executive", label: "Executive" },
      { href: "/reports/campaigns", label: "Campaigns" },
      { href: "/reports/customers", label: "Customers" },
      { href: "/reports/events", label: "Events" },
      { href: "/reports/whatsapp", label: "WhatsApp" },
    ],
  },
  { href: "/events", icon: GraduationCap, label: "Events" },
  {
    label: "Benar Foundation",
    icon: Heart,
    children: [
      { href: "/benar-foundation/monitoring", label: "Monitoring" },
      { href: "/benar-foundation/supported", label: "Supported" },
    ],
  },
  { href: "/templates", icon: MessageSquare, label: "Templates" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/webhook", icon: Activity, label: "Webhook" },
  { href: "/halosis", icon: Database, label: "Halosis" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Benar Foundation"]));
  const pathname = usePathname();

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href: string) => pathname.startsWith(href);

  const isGroupActive = (group: NavGroup) =>
    group.children.some((c) => isActive(c.href));

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-white/7 bg-[#0d0d0f]"
    >
      <div className={cn("flex h-14 items-center border-b border-white/7 px-4", collapsed ? "justify-center" : "gap-3")}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500">
          <span className="text-sm font-bold text-white">H</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-semibold text-white whitespace-nowrap overflow-hidden"
            >
              HaloBro
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item, i) => {
          if (isGroup(item)) {
            const active = isGroupActive(item);
            const expanded = !collapsed && expandedGroups.has(item.label);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <button
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setExpandedGroups((prev) => new Set(prev).add(item.label));
                    } else {
                      toggleGroup(item.label);
                    }
                  }}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full",
                    "relative",
                    active
                      ? "bg-violet-500/15 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5",
                    collapsed && "justify-center px-2"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon
                    size={18}
                    className={cn("flex-shrink-0 transition-colors", active ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300")}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 text-left whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={14} className="text-zinc-600" />
                    </motion.div>
                  )}
                </button>

                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/7 pl-2">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "block px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                                childActive
                                  ? "bg-violet-500/15 text-violet-300"
                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          const active = isActive(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  "relative",
                  active
                    ? "bg-violet-500/15 text-white border-l-2 border-violet-400"
                    : "text-zinc-400 hover:text-white hover:bg-white/5",
                  collapsed && "justify-center px-2"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon
                  size={18}
                  className={cn("flex-shrink-0 transition-colors", active ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300")}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="border-t border-white/7 p-2">
        <Link
          href="/api/auth/logout"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-1 flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
