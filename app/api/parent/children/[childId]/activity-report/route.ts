import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb } from "@/lib/server/store";

type Range = "day" | "week" | "month";

export async function GET(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  const child = db.children.find((c) => c.id === params.childId && c.parentId === user.id);
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const range = (req.nextUrl.searchParams.get("range") as Range) || "day";
  const apps = child.installedApps?.length ? child.installedApps : ["YouTube", "Chrome", "WhatsApp"];
  const now = Date.now();
  const timeline = apps.slice(0, 6).map((app, i) => ({
    appName: app,
    startedAt: new Date(now - i * 1000 * 60 * 45).toISOString(),
    durationMinutes: Math.max(5, Math.round((child.todayScreenTimeMinutes || 60) / (i + 2))),
  }));

  const totalsByApp: Record<string, number> = {};
  timeline.forEach((t) => {
    totalsByApp[t.appName] = (totalsByApp[t.appName] || 0) + t.durationMinutes;
  });

  const dayKey = new Date().toISOString().slice(0, 10);
  const totalsByDay: Record<string, number> = {
    [dayKey]: timeline.reduce((acc, item) => acc + item.durationMinutes, 0),
  };

  return NextResponse.json({
    range,
    timeline,
    totalsByApp,
    totalsByDay,
    suspiciousSignals: child.suspiciousSignals ?? [],
    suspiciousScore: child.suspiciousScore ?? 0,
    lastSnapshotAt: child.lastSnapshotAt ?? null,
  });
}
