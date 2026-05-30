"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import EventActivity from "@/components/ui/event-activity";

interface AppUserInfo {
  guid: string;
  name: string | null;
  email: string | null;
  credit: number;
  lastUsedAt?: string | null;
}

interface EventSide {
  userCount: number;
  totalCredit: number;
  usage: Array<{
    name: string;
    users: number;
    credit: number;
    userList: AppUserInfo[];
  }>;
  purchases: Array<{
    name: string;
    users: number;
    credit: number;
    userList: AppUserInfo[];
  }>;
}

interface EventData {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  totalEnrolled: number;
  activeUsers: number;
  beforeEvent: EventSide;
  onEvent: EventSide;
  afterEvent: EventSide;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/events/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <EventActivity
        events={events}
        loading={loading}
        onExport={handleExport}
        exporting={exporting}
      />
    </motion.div>
  );
}
