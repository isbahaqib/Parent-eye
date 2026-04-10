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
  const dayKey = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();
  const rangeStartMs =
    range === "month"
      ? nowMs - 30 * 24 * 60 * 60 * 1000
      : range === "week"
        ? nowMs - 7 * 24 * 60 * 60 * 1000
        : nowMs - 24 * 60 * 60 * 1000;
  const usage = (child.usageEvents ?? []).filter(
    (item) =>
      Number.isFinite(item.eventTimestamp) &&
      item.eventTimestamp >= rangeStartMs &&
      item.eventTimestamp <= nowMs
  );

  const timeline = usage
    .slice(-100)
    .map((item) => ({
      appName: item.appName,
      startedAt: new Date(item.eventTimestamp).toISOString(),
      durationMinutes: item.durationMinutes,
    }))
    .reverse();

  const totalsByApp: Record<string, number> = {};
  const totalsByDay: Record<string, number> = {};
  for (const item of usage) {
    totalsByApp[item.appName] = (totalsByApp[item.appName] || 0) + item.durationMinutes;
    const key = new Date(item.eventTimestamp).toISOString().slice(0, 10);
    totalsByDay[key] = (totalsByDay[key] || 0) + item.durationMinutes;
  }

  // Ensure "today" always has a value for dashboard card.
  if (totalsByDay[dayKey] == null) {
    totalsByDay[dayKey] = Math.max(0, child.todayScreenTimeMinutes ?? 0);
  }

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
