import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readDb, writeDb } from "@/lib/server/store";
import { computeSuspiciousScore, computeSuspiciousSignals } from "@/lib/server/safety";

const CHILD_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";

function sign(input: string): string {
  return createHmac("sha256", CHILD_SECRET).update(input).digest("base64url");
}

function getChildIdFromAuth(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    sub?: string;
    exp?: number;
    typ?: string;
  };
  if (!parsed?.sub || parsed.typ !== "child" || (parsed.exp ?? 0) < Date.now()) return null;
  return parsed.sub;
}

export async function POST(req: NextRequest) {
  const childId = getChildIdFromAuth(req);
  if (!childId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    location?: string | null;
    battery?: number | null;
    activeApp?: string | null;
    todayScreenTimeMinutes?: number | null;
    riskyEvents?: number | null;
    isOnline?: boolean | null;
    installedApps?: string[] | null;
    appName?: string | null;
    durationMinutes?: number | null;
    eventTimestamp?: number | null;
    harmfulContentDetected?: boolean | null;
    harmfulCategory?: string | null;
    harmfulContentText?: string | null;
  };

  const db = await readDb();
  const idx = db.children.findIndex((c) => c.id === childId);
  if (idx < 0) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  const child = db.children[idx];

  if (body.location != null) child.location = String(body.location);
  if (body.battery != null) child.battery = Number(body.battery);
  if (body.activeApp != null) {
    child.activeApp = String(body.activeApp);
    const normalizedApp = child.activeApp.trim();
    if (normalizedApp && normalizedApp.toLowerCase() !== "unknown") {
      const installed = new Set(child.installedApps ?? []);
      installed.add(normalizedApp);
      child.installedApps = Array.from(installed);
    }
  }
  if (body.todayScreenTimeMinutes != null) child.todayScreenTimeMinutes = Number(body.todayScreenTimeMinutes);
  if (body.riskyEvents != null) child.riskyEvents = Number(body.riskyEvents);
  if (body.isOnline != null) child.isOnline = Boolean(body.isOnline);
  if (Array.isArray(body.installedApps)) {
    const cleaned = Array.from(
      new Set(
        body.installedApps
          .map((name) => String(name).trim())
          .filter((name) => name.length > 0)
      )
    );
    child.installedApps = cleaned;
  }
  if (body.appName != null && body.durationMinutes != null) {
    const appName = String(body.appName).trim();
    const durationMinutes = Number(body.durationMinutes);
    const eventTimestamp = Number(body.eventTimestamp ?? Date.now());
    if (appName && Number.isFinite(durationMinutes) && durationMinutes > 0) {
      child.usageEvents = child.usageEvents ?? [];
      child.usageEvents.push({
        appName,
        durationMinutes: Math.max(1, Math.round(durationMinutes)),
        eventTimestamp: Number.isFinite(eventTimestamp) ? eventTimestamp : Date.now(),
      });
      if (child.usageEvents.length > 2000) {
        child.usageEvents = child.usageEvents.slice(-2000);
      }
    }
  }
  child.lastSeen = new Date().toISOString();
  child.lastSnapshotAt = child.lastSeen;

  child.suspiciousSignals = computeSuspiciousSignals(child);
  child.suspiciousScore = computeSuspiciousScore(child);

  if (body.harmfulContentDetected) {
    db.alerts = db.alerts ?? [];
    db.alerts.push({
      id: randomUUID(),
      parentId: child.parentId,
      childId: child.id,
      type: "harmful_content",
      message: `${child.name}: harmful content detected`,
      details: {
        category: body.harmfulCategory ?? "unknown",
        preview: body.harmfulContentText?.slice(0, 120) ?? null,
      },
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  await writeDb(db);
  return NextResponse.json({
    message: "Telemetry saved",
    screenTimeLimitMinutes: child.screenTimeLimitMinutes,
    blockedApps: child.blockedApps ?? [],
  });
}
