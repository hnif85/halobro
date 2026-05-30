import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch events data dari internal API (cookie dari request asli)
    const selfUrl = new URL("/api/events", req.url);
    const apiRes = await fetch(selfUrl.toString(), {
      headers: { Cookie: req.headers.get("cookie") || "" },
    });

    if (!apiRes.ok) {
      const text = await apiRes.text();
      throw new Error(`Events API ${apiRes.status}: ${text}`);
    }

    const { events }: { events: any[] } = await apiRes.json();

    if (!events || events.length === 0) {
      return NextResponse.json({ error: "No event data" }, { status: 404 });
    }

    // ── Build workbook ──────────────────────────────────────────────
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan Event
    const ringkasanRows = events.map((ev) => {
      const activeRate = ev.totalEnrolled > 0
        ? Math.round((ev.activeUsers / ev.totalEnrolled) * 100)
        : 0;
      return {
        Event: ev.name,
        Tanggal: ev.event_date || "",
        Lokasi: ev.location || "",
        Tipe: ev.event_type || "",
        Terdaftar: ev.totalEnrolled,
        Aktif: ev.activeUsers,
        "%Aktif": activeRate,
        "Sebelum (User)": ev.beforeEvent.userCount,
        "Sebelum (Credit)": ev.beforeEvent.totalCredit,
        "Hari (User)": ev.onEvent.userCount,
        "Hari (Credit)": ev.onEvent.totalCredit,
        "Setelah (User)": ev.afterEvent.userCount,
        "Setelah (Credit)": ev.afterEvent.totalCredit,
      };
    });
    const sheet1 = XLSX.utils.json_to_sheet(ringkasanRows);
    XLSX.utils.book_append_sheet(wb, sheet1, "Ringkasan Event");

    // Sheet 2: Pemakaian per App
    const pemakaianRows: any[] = [];
    for (const ev of events) {
      for (const period of ["beforeEvent", "onEvent", "afterEvent"] as const) {
        const label = period === "beforeEvent" ? "Sebelum" : period === "onEvent" ? "Hari" : "Setelah";
        for (const app of ev[period].usage) {
          pemakaianRows.push({
            Event: ev.name,
            Periode: label,
            App: app.name,
            Users: app.users,
            "Total Credit": app.credit,
          });
        }
      }
    }
    const sheet2 = XLSX.utils.json_to_sheet(pemakaianRows);
    XLSX.utils.book_append_sheet(wb, sheet2, "Pemakaian per App");

    // Sheet 3: Detail Pengguna
    const userRows: any[] = [];
    for (const ev of events) {
      for (const period of ["beforeEvent", "onEvent", "afterEvent"] as const) {
        const label = period === "beforeEvent" ? "Sebelum" : period === "onEvent" ? "Hari" : "Setelah";
        for (const app of ev[period].usage) {
          for (const u of app.userList) {
            userRows.push({
              Event: ev.name,
              Periode: label,
              App: app.name,
              Nama: u.name || "",
              Email: u.email || "",
              Credit: u.credit,
              "Terakhir Pakai": u.lastUsedAt
                ? new Date(u.lastUsedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            });
          }
        }
        for (const app of ev[period].purchases) {
          for (const u of app.userList) {
            userRows.push({
              Event: ev.name,
              Periode: label,
              App: app.name,
              Nama: u.name || "",
              Email: u.email || "",
              Credit: u.credit,
              Paket: u.packages?.[0] || "",
              "Terakhir Pakai": u.lastUsedAt
                ? new Date(u.lastUsedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "",
            });
          }
        }
      }
    }
    const sheet3 = XLSX.utils.json_to_sheet(userRows);
    XLSX.utils.book_append_sheet(wb, sheet3, "Detail Pengguna");

    // Sheet 4: Pembelian
    const pembelianRows: any[] = [];
    for (const ev of events) {
      for (const period of ["beforeEvent", "onEvent", "afterEvent"] as const) {
        const label = period === "beforeEvent" ? "Sebelum" : period === "onEvent" ? "Hari" : "Setelah";
        for (const app of ev[period].purchases) {
          pembelianRows.push({
            Event: ev.name,
            Periode: label,
            App: app.name,
            Users: app.users,
            "Total Credit": app.credit,
          });
        }
      }
    }
    const sheet4 = XLSX.utils.json_to_sheet(pembelianRows);
    XLSX.utils.book_append_sheet(wb, sheet4, "Pembelian");

    // ── Generate buffer ─────────────────────────────────────────────
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const filename = `events-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buf.byteLength.toString(),
      },
    });
  } catch (e: any) {
    console.error("❌ Events export error:", e);
    return NextResponse.json({ error: "Export failed", message: e?.message || String(e) }, { status: 500 });
  }
}
