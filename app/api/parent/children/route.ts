import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";
import type { ChildRecord } from "@/lib/server/types";
import {
  computeSuspiciousScore,
  computeSuspiciousSignals,
  detectAgeGroup,
  recommendedBlocksByAgeGroup,
} from "@/lib/server/safety";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  return NextResponse.json({
    children: db.children
      .filter((c) => c.parentId === user.id)
      .sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1)),
  });
}

export async function POST(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<ChildRecord>;
  if (!body.name || !body.device) {
    return NextResponse.json({ error: "name and device are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ageGroup = detectAgeGroup(body.age ?? null);
  const recommended = recommendedBlocksByAgeGroup(ageGroup);
  const child: ChildRecord = {
    id: randomUUID(),
    parentId: user.id,
    name: String(body.name).trim(),
    age: body.age ?? null,
    device: String(body.device).trim(),
    battery: body.battery ?? 100,
    location: body.location ?? "Unknown",
    lastSeen: now,
    todayScreenTimeMinutes: body.todayScreenTimeMinutes ?? 0,
    screenTimeLimitMinutes: body.screenTimeLimitMinutes ?? recommended.screenTimeLimitMinutes,
    blockedApps: body.blockedApps ?? recommended.blockedApps,
    blockedWebsites: body.blockedWebsites ?? recommended.blockedWebsites,
    installedApps: body.installedApps ?? [],
    riskyEvents: body.riskyEvents ?? 0,
    estimatedAge: body.age ?? null,
    ageConfidence: 0.95,
    ageGroup,
    suspiciousSignals: [],
    suspiciousScore: 0,
    lastSnapshotAt: now,
    activeApp: body.activeApp ?? "Unknown",
    isOnline: body.isOnline ?? true,
  };
  child.suspiciousSignals = computeSuspiciousSignals(child);
  child.suspiciousScore = computeSuspiciousScore(child);

  const db = await readDb();
  db.children.push(child);
  await writeDb(db);
  return NextResponse.json({ message: "Child created", child }, { status: 201 });
}
