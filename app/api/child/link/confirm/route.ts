import { createHmac, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readDb, writeDb } from "@/lib/server/store";
import type { ChildRecord } from "@/lib/server/types";
import {
  computeSuspiciousScore,
  computeSuspiciousSignals,
  detectAgeGroup,
  recommendedBlocksByAgeGroup,
} from "@/lib/server/safety";

const CHILD_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";

function sign(input: string): string {
  return createHmac("sha256", CHILD_SECRET).update(input).digest("base64url");
}

function createChildToken(childId: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: childId,
      typ: "child",
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

type ConfirmBody = {
  code?: string;
  platform?: string;
  childName?: string;
  deviceName?: string;
  age?: number | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ConfirmBody;
  const code = String(body.code ?? "").trim();
  const platform = String(body.platform ?? "").trim().toLowerCase();
  const childName = String(body.childName ?? "").trim() || "Child Device";
  const deviceName = String(body.deviceName ?? "").trim() || "Android Device";
  const age =
    body.age === undefined || body.age === null
      ? null
      : Number.isFinite(Number(body.age))
        ? Number(body.age)
        : null;

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }
  if (platform !== "android") {
    return NextResponse.json({ error: "Only android platform is supported" }, { status: 400 });
  }

  const db = await readDb();
  db.linkCodes = db.linkCodes ?? [];

  const match = db.linkCodes.find(
    (item) => item.code === code && !item.used && new Date(item.expiresAt).getTime() > Date.now()
  );
  if (!match) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const ageGroup = detectAgeGroup(age);
  const recommended = recommendedBlocksByAgeGroup(ageGroup);
  const existingIdx = db.children.findIndex(
    (item) => item.parentId === match.parentId && item.device === deviceName
  );

  const child: ChildRecord =
    existingIdx >= 0
      ? {
          ...db.children[existingIdx],
          name: childName || db.children[existingIdx].name,
          age,
          estimatedAge: age,
          ageConfidence: 0.95,
          ageGroup,
          lastSeen: now,
          lastSnapshotAt: now,
          isOnline: true,
        }
      : {
          id: randomUUID(),
          parentId: match.parentId,
          name: childName,
          age,
          device: deviceName,
          battery: 100,
          location: "Unknown",
          lastSeen: now,
          todayScreenTimeMinutes: 0,
          screenTimeLimitMinutes: recommended.screenTimeLimitMinutes,
          blockedApps: recommended.blockedApps,
          blockedWebsites: recommended.blockedWebsites,
          installedApps: [],
          riskyEvents: 0,
          estimatedAge: age,
          ageConfidence: 0.95,
          ageGroup,
          suspiciousSignals: [],
          suspiciousScore: 0,
          lastSnapshotAt: now,
          activeApp: "Unknown",
          isOnline: true,
        };
  child.suspiciousSignals = computeSuspiciousSignals(child);
  child.suspiciousScore = computeSuspiciousScore(child);

  if (existingIdx >= 0) {
    db.children[existingIdx] = child;
  } else {
    db.children.push(child);
  }
  match.used = true;
  await writeDb(db);

  return NextResponse.json({
    message: "Child device linked successfully",
    childToken: createChildToken(child.id),
    child,
    parentId: match.parentId,
  });
}
