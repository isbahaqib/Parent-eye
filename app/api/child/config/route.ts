import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/store";

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

export async function GET(req: NextRequest) {
  const childId = getChildIdFromAuth(req);
  if (!childId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  const child = db.children.find((c) => c.id === childId);
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  return NextResponse.json({
    childId: child.id,
    screenTimeLimitMinutes: child.screenTimeLimitMinutes,
    blockedApps: child.blockedApps ?? [],
  });
}
