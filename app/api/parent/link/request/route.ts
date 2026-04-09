import { randomInt, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { childName?: string };
  const db = await readDb();
  const code = String(randomInt(100000, 1000000));
  const expiresAt = Date.now() + 1000 * 60 * 10;

  db.linkCodes = db.linkCodes ?? [];
  db.linkCodes.push({
    id: randomUUID(),
    parentId: user.id,
    childName: body.childName?.trim() || "Child Device",
    code,
    expiresAt: new Date(expiresAt).toISOString(),
    used: false,
  });
  await writeDb(db);

  return NextResponse.json({
    code,
    expiresAt,
    message: "Share this code on child device to connect",
  });
}
