import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";
import { computeSuspiciousScore, computeSuspiciousSignals, detectAgeGroup } from "@/lib/server/safety";

function parseAgeGroup(value: unknown): "under_13" | "13_to_15" | "16_plus" | undefined {
  if (value === "under_13" || value === "13_to_15" || value === "16_plus") return value;
  return undefined;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const db = await readDb();
  const idx = db.children.findIndex((c) => c.id === params.childId && c.parentId === user.id);
  if (idx < 0) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const current = db.children[idx];
  db.children[idx] = {
    ...current,
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.age !== undefined ? { age: Number(body.age) || null } : {}),
    ...(body.device !== undefined ? { device: String(body.device).trim() } : {}),
    ...(body.battery !== undefined ? { battery: Number(body.battery) } : {}),
    ...(body.location !== undefined ? { location: String(body.location) } : {}),
    ...(body.lastSeen !== undefined ? { lastSeen: String(body.lastSeen) } : {}),
    ...(body.todayScreenTimeMinutes !== undefined
      ? { todayScreenTimeMinutes: Number(body.todayScreenTimeMinutes) }
      : {}),
    ...(body.screenTimeLimitMinutes !== undefined
      ? { screenTimeLimitMinutes: Number(body.screenTimeLimitMinutes) }
      : {}),
    ...(body.blockedApps !== undefined
      ? { blockedApps: Array.isArray(body.blockedApps) ? body.blockedApps.map(String) : [] }
      : {}),
    ...(body.blockedWebsites !== undefined
      ? {
          blockedWebsites: Array.isArray(body.blockedWebsites)
            ? body.blockedWebsites.map(String)
            : [],
        }
      : {}),
    ...(body.installedApps !== undefined
      ? { installedApps: Array.isArray(body.installedApps) ? body.installedApps.map(String) : [] }
      : {}),
    ...(body.riskyEvents !== undefined ? { riskyEvents: Number(body.riskyEvents) } : {}),
    ...(body.estimatedAge !== undefined ? { estimatedAge: Number(body.estimatedAge) || null } : {}),
    ...(body.ageConfidence !== undefined ? { ageConfidence: Number(body.ageConfidence) } : {}),
    ...(body.ageGroup !== undefined ? { ageGroup: parseAgeGroup(body.ageGroup) } : {}),
    ...(body.suspiciousSignals !== undefined
      ? {
          suspiciousSignals: Array.isArray(body.suspiciousSignals)
            ? body.suspiciousSignals.map(String)
            : [],
        }
      : {}),
    ...(body.lastSnapshotAt !== undefined ? { lastSnapshotAt: String(body.lastSnapshotAt) } : {}),
    ...(body.activeApp !== undefined ? { activeApp: String(body.activeApp) } : {}),
    ...(body.isOnline !== undefined ? { isOnline: Boolean(body.isOnline) } : {}),
  };
  const nextChild = db.children[idx];
  if (body.age !== undefined && !body.ageGroup) {
    nextChild.ageGroup = detectAgeGroup(nextChild.age);
    nextChild.estimatedAge = nextChild.age;
  }
  nextChild.suspiciousSignals = computeSuspiciousSignals(nextChild);
  nextChild.suspiciousScore = computeSuspiciousScore(nextChild);

  await writeDb(db);
  return NextResponse.json({ message: "Child updated", child: nextChild });
}
