import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sbGet, sbGetChunked } from "@/lib/supabase-api";

export async function GET(_req: NextRequest) {
  try {
  const user = requireAuth(_req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── 1. Fetch semua events ─────────────────────────────────────────
  const events: any[] = await sbGet(
    "training_events?select=id,name,event_date,location,event_type&order=event_date.desc"
  );

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [] });
  }

  const eventIds = events.map((e) => e.id);

  // ── 2. Fetch semua enrollment (bridge training_events → user) ────
  const enrollments: any[] = await sbGetChunked(
    "training_enrollments",
    "event_id,user_guid,email",
    "event_id",
    eventIds,
    "user_guid=not.is.null"
  );

  const eventUserMap: Record<string, Set<string>> = {};
  for (const ev of events) {
    eventUserMap[ev.id] = new Set();
  }
  const allUserGuids = new Set<string>();

  for (const enr of enrollments || []) {
    if (enr.user_guid) {
      if (eventUserMap[enr.event_id]) {
        eventUserMap[enr.event_id].add(enr.user_guid);
      }
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
        beforeEvent: { userCount: 0, totalCredit: 0, usage: [], purchases: [] },
        onEvent: { userCount: 0, totalCredit: 0, usage: [], purchases: [] },
        afterEvent: { userCount: 0, totalCredit: 0, usage: [], purchases: [] },
      })),
    });
  }

  // ── 3. Fetch semua credit_manager_transactions ──────────────────
  const allTxns: any[] = await sbGetChunked(
    "credit_manager_transactions",
    "id,user_id,agent,amount,created_at,type",
    "user_id",
    userArray
  );

  // ── 4. Fetch products untuk resolve agent_id → app_name ────────────
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

    for (const p of products || []) {
      productMap[p.agent_id] = p.app_name;
    }
  }

  // ── 3b. Fetch paid purchases (bukan FREE TRIAL) ──────────────────
  const userStrings = userArray.map((g: string) => g.toString());
  const paidTxns: any[] = await sbGetChunked(
    "transactions",
    "customer_guid,created_at,transaction_details:transaction_details!inner(product_name,purchase_type_name)",
    "customer_guid",
    userStrings,
    "payment_channel_name=neq.FREE TRIAL"
  );

  const paidTxLookup: Record<string, { time: Date; productName: string; appName: string }[]> = {};
  for (const tx of paidTxns || []) {
    if (!tx.created_at) continue;
    const txnTime = new Date(tx.created_at);
    for (const td of tx.transaction_details || []) {
      if (td.purchase_type_name !== "Free Trial" && td.product_name) {
        const appName = (td.product_name as string).split(" - ")[0];
        if (!paidTxLookup[tx.customer_guid]) paidTxLookup[tx.customer_guid] = [];
        paidTxLookup[tx.customer_guid].push({ time: txnTime, productName: td.product_name, appName });
      }
    }
  }

  // Match credit grants → paid transactions via time proximity (< 1 jam)
  const matchedPaidIds = new Set<string>();
  const paidCreditIdToPkg = new Map<string, string>();

  for (const t of allTxns) {
    if (t.type !== "credit" || !t.agent || !t.user_id) continue;
    const appName = productMap[t.agent];
    if (!appName) continue;

    const paidTxnsForUser = paidTxLookup[t.user_id];
    if (!paidTxnsForUser) continue;

    const creditTime = new Date(t.created_at);
    for (const ptx of paidTxnsForUser) {
      if (ptx.appName !== appName) continue;
      const diffMs = Math.abs(creditTime.getTime() - ptx.time.getTime());
      if (diffMs < 3600000) {
        matchedPaidIds.add(t.id);
        paidCreditIdToPkg.set(t.id, ptx.productName);
      }
    }
  }

  // ── 5. Fetch info pelanggan (nama & email) ─────────────────────────
  const customers: any[] = await sbGetChunked(
    "cms_customers",
    "guid,full_name,email",
    "guid",
    userArray
  );

  const userInfo: Record<string, { name: string; email: string }> = {};
  for (const c of customers || []) {
    if (c.guid) {
      userInfo[c.guid] = {
        name: c.full_name || "",
        email: c.email || "",
      };
    }
  }

  for (const enr of enrollments || []) {
    if (enr.user_guid && enr.email && !userInfo[enr.user_guid]?.email) {
      if (!userInfo[enr.user_guid]) {
        userInfo[enr.user_guid] = { name: "", email: "" };
      }
      userInfo[enr.user_guid].email = enr.email;
    }
  }

  // ── 6. Aggregate per event ────────────────────────────────────────
  type AppInfo = { name: string; userSet: Set<string>; credit: number; packages?: Set<string> };

  const result = events.map((ev) => {
    const userSet = eventUserMap[ev.id];
    const totalEnrolled = userSet.size;

    const customerTxns = allTxns.filter(
      (t: any) => t.user_id && userSet.has(t.user_id)
    );

    const eventDate = ev.event_date?.slice(0, 10);
    const eventTs = eventDate ? new Date(eventDate + "T00:00:00") : null;

    const beforeEventTxns = customerTxns.filter(
      (t: any) => eventTs && new Date(t.created_at) < eventTs
    );
    const onEventTxns = customerTxns.filter(
      (t: any) => eventDate && new Date(t.created_at).toISOString().slice(0, 10) === eventDate
    );
    const afterEventTxns = customerTxns.filter(
      (t: any) => eventTs && new Date(t.created_at) >= new Date(eventDate + "T23:59:59")
    );

    function aggregate(txns: any[], withPackages?: boolean) {
      const appMap = new Map<string, AppInfo>();
      const userSet = new Set<string>();
      const userAppCredit = new Map<string, number>();
      const userAppPkgs = new Map<string, Set<string>>();
      const userAppLastUsage = new Map<string, string>();

      for (const t of txns) {
        const appName = t.agent ? productMap[t.agent] : null;
        if (!appName || !t.user_id) continue;

        userSet.add(t.user_id);
        if (!appMap.has(appName)) {
          appMap.set(appName, { name: appName, userSet: new Set(), credit: 0, packages: new Set() });
        }
        const app = appMap.get(appName)!;
        app.userSet.add(t.user_id);
        app.credit += Number(t.amount) || 0;

        const creditKey = `${appName}:${t.user_id}`;
        userAppCredit.set(creditKey, (userAppCredit.get(creditKey) || 0) + (Number(t.amount) || 0));

        if (t.created_at) {
          const prev = userAppLastUsage.get(creditKey);
          if (!prev || t.created_at > prev) {
            userAppLastUsage.set(creditKey, t.created_at);
          }
        }

        if (withPackages) {
          const pkg = paidCreditIdToPkg.get(t.id);
          if (pkg) {
            app.packages!.add(pkg);
            const uKey = `${t.user_id}:${appName}`;
            if (!userAppPkgs.has(uKey)) userAppPkgs.set(uKey, new Set());
            userAppPkgs.get(uKey)!.add(pkg);
          }
        }
      }

      const apps = [...appMap.values()]
        .map((a) => {
          const userList = [...a.userSet]
            .map((guid) => ({
              guid,
              name: userInfo[guid]?.name || null,
              email: userInfo[guid]?.email || null,
              credit: userAppCredit.get(`${a.name}:${guid}`) || 0,
              packages: withPackages ? [...(userAppPkgs.get(`${guid}:${a.name}`) || [])] : undefined,
              lastUsedAt: userAppLastUsage.get(`${a.name}:${guid}`) || null,
            }))
            .filter((u) => u.credit > 0)
            .sort((x: any, y: any) => y.credit - x.credit);

          return {
            name: a.name,
            users: a.userSet.size,
            credit: a.credit,
            userList,
            packages: withPackages ? [...a.packages!].sort() : undefined,
          };
        })
        .sort((a, b) => b.credit - a.credit);

      const totalCredit = apps.reduce((s: number, a: any) => s + a.credit, 0);

      return { userCount: userSet.size, totalCredit, apps };
    }

    const isDebit = (t: any) => !t.type || t.type === "debit";
    const isPaid = (t: any) => matchedPaidIds.has(t.id);

    const beforeUsage = aggregate(beforeEventTxns.filter(isDebit));
    const beforePurchases = aggregate(beforeEventTxns.filter(isPaid), true);
    const onUsage = aggregate(onEventTxns.filter(isDebit));
    const onPurchases = aggregate(onEventTxns.filter(isPaid), true);
    const afterUsage = aggregate(afterEventTxns.filter(isDebit));
    const afterPurchases = aggregate(afterEventTxns.filter(isPaid), true);

    const activeUsers = new Set<string>();
    for (const t of customerTxns) {
      if (t.user_id && isDebit(t)) activeUsers.add(t.user_id);
    }

    return {
      id: ev.id,
      name: ev.name,
      event_date: ev.event_date,
      location: ev.location,
      event_type: ev.event_type,
      totalEnrolled,
      activeUsers: activeUsers.size,
      beforeEvent: {
        userCount: beforeUsage.userCount,
        totalCredit: beforeUsage.totalCredit,
        usage: beforeUsage.apps,
        purchases: beforePurchases.apps,
      },
      onEvent: {
        userCount: onUsage.userCount,
        totalCredit: onUsage.totalCredit,
        usage: onUsage.apps,
        purchases: onPurchases.apps,
      },
      afterEvent: {
        userCount: afterUsage.userCount,
        totalCredit: afterUsage.totalCredit,
        usage: afterUsage.apps,
        purchases: afterPurchases.apps,
      },
    };
  });

  return NextResponse.json({ events: result });
  } catch (e: any) {
    console.error("❌ Events API error:", e);
    return NextResponse.json({ error: "Internal error", message: e?.message || String(e) }, { status: 500 });
  }
}
