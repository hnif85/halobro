import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet, sbGetChunked } from "@/lib/supabase-api";

export async function GET(_req: NextRequest) {
  const user = requireAuth(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events: any[] = await sbGet(
    "training_events?select=id,name,event_date,location,event_type&order=event_date.desc"
  );

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const eventIds = events.map((e) => e.id);
  const enrollments: any[] = await sbGetChunked(
    "training_enrollments",
    "event_id,user_guid,email",
    "event_id",
    eventIds,
    "user_guid=not.is.null"
  );

  const eventUserMap: Record<string, Set<string>> = {};
  const allUserGuids = new Set<string>();

  for (const ev of events) eventUserMap[ev.id] = new Set();

  for (const enr of enrollments || []) {
    if (enr.user_guid && eventUserMap[enr.event_id]) {
      eventUserMap[enr.event_id].add(enr.user_guid);
      allUserGuids.add(enr.user_guid);
    }
  }

  const userArray = [...allUserGuids];
  if (userArray.length === 0) {
    return NextResponse.json({
      events: events.map((ev) => ({
        id: ev.id,
        name: ev.name,
        event_date: ev.event_date,
        location: ev.location,
        event_type: ev.event_type,
        totalEnrolled: 0,
        activeUsers: 0,
        beforeUsage: 0,
        afterUsage: 0,
        uplift: 0,
      })),
    });
  }

  const allTxns: any[] = await sbGetChunked(
    "credit_manager_transactions",
    "id,user_id,agent,amount,created_at,type",
    "user_id",
    userArray
  );

  const agentIds = [...new Set(allTxns.map((t: any) => t.agent).filter(Boolean))];
  const productMap: Record<string, string> = {};

  if (agentIds.length > 0) {
    const products: any[] = await sbGetChunked(
      "products",
      "agent_id,app_name",
      "agent_id",
      agentIds,
      "app_name=not.is.null"
    );
    for (const p of products || []) productMap[p.agent_id] = p.app_name;
  }

  const customers: any[] = await sbGetChunked(
    "cms_customers",
    "guid,full_name,email",
    "guid",
    userArray
  );
  const userInfo: Record<string, { name: string; email: string }> = {};
  for (const c of customers || []) {
    if (c.guid) userInfo[c.guid] = { name: c.full_name || "", email: c.email || "" };
  }

  const result = events.map((ev) => {
    const userSet = eventUserMap[ev.id];
    const totalEnrolled = userSet.size;
    const customerTxns = allTxns.filter((t: any) => t.user_id && userSet.has(t.user_id));

    const eventDate = ev.event_date?.slice(0, 10);
    const eventTs = eventDate ? new Date(eventDate + "T00:00:00") : null;
    const eventEnd = eventDate ? new Date(eventDate + "T23:59:59") : null;

    const beforeEventTxns = customerTxns.filter((t: any) => eventTs && new Date(t.created_at) < eventTs);
    const afterEventTxns = customerTxns.filter((t: any) => eventEnd && new Date(t.created_at) >= eventEnd);

    const isDebit = (t: any) => !t.type || t.type === "debit";
    const beforeDebit = beforeEventTxns.filter(isDebit);
    const afterDebit = afterEventTxns.filter(isDebit);

    const beforeUsage = beforeDebit.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
    const afterUsage = afterDebit.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

    const beforeUsers = new Set(beforeDebit.map((t: any) => t.user_id)).size;
    const afterUsers = new Set(afterDebit.map((t: any) => t.user_id)).size;

    const activeSet = new Set(customerTxns.filter(isDebit).map((t: any) => t.user_id));

    const userDetails = [...activeSet].map((guid) => ({
      guid,
      name: userInfo[guid as string]?.name || "Unknown",
      email: userInfo[guid as string]?.email || "",
      beforeCredit: beforeDebit.filter((t: any) => t.user_id === guid).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0),
      afterCredit: afterDebit.filter((t: any) => t.user_id === guid).reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0),
    }));

    const uplift = beforeUsage > 0 ? Math.round(((afterUsage - beforeUsage) / beforeUsage) * 100) : afterUsage > 0 ? 100 : 0;

    const beforeApps = new Map<string, number>();
    const afterApps = new Map<string, number>();
    for (const t of beforeDebit) {
      const app = t.agent ? productMap[t.agent] : null;
      if (app) beforeApps.set(app, (beforeApps.get(app) || 0) + (Number(t.amount) || 0));
    }
    for (const t of afterDebit) {
      const app = t.agent ? productMap[t.agent] : null;
      if (app) afterApps.set(app, (afterApps.get(app) || 0) + (Number(t.amount) || 0));
    }

    const appComparison = [...new Set([...beforeApps.keys(), ...afterApps.keys()])].map((app) => ({
      app,
      before: beforeApps.get(app) || 0,
      after: afterApps.get(app) || 0,
    }));

    return {
      id: ev.id,
      name: ev.name,
      event_date: ev.event_date,
      location: ev.location,
      event_type: ev.event_type,
      totalEnrolled,
      activeUsers: activeSet.size,
      beforeUsers,
      afterUsers,
      beforeUsage,
      afterUsage,
      uplift,
      userDetails: userDetails.sort((a, b) => b.afterCredit - a.afterCredit),
      appComparison,
    };
  });

  return NextResponse.json({ events: result });
}
