import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
  const limit = Number(req.nextUrl.searchParams.get("limit") || "20");

  const db = await readDb();
  db.alerts = db.alerts ?? [];

  const existing = db.alerts.filter((a) => a.parentId === user.id);
  if (existing.length === 0) {
    const children = db.children.filter((c) => c.parentId === user.id);
    const synthetic = children
      .filter((c) => c.riskyEvents > 0 || (c.suspiciousScore ?? 0) >= 35)
      .map((c) => ({
        id: randomUUID(),
        parentId: user.id,
        childId: c.id,
        type: "suspicious_behaviour",
        message: `${c.name} risk score ${c.suspiciousScore ?? 0} (${c.riskyEvents} risky events)`,
        details: {
          category: "behaviour",
          preview: c.suspiciousSignals?.[0] ?? c.activeApp ?? null,
        },
        read: false,
        createdAt: new Date().toISOString(),
      }));
    if (synthetic.length) {
      db.alerts.push(...synthetic);
      await writeDb(db);
    }
  }

  let alerts = db.alerts.filter((a) => a.parentId === user.id);
  if (unreadOnly) alerts = alerts.filter((a) => !a.read);
  alerts = alerts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, Math.max(1, limit));
  const unreadCount = db.alerts.filter((a) => a.parentId === user.id && !a.read).length;

  return NextResponse.json({ alerts, unreadCount });
}
