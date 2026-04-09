import { NextResponse, type NextRequest } from "next/server";
import { createToken, requireParent, sanitizeUser } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: sanitizeUser(user) });
}

export async function PATCH(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string };

  const db = await readDb();
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx < 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.email) {
    const normalized = body.email.trim().toLowerCase();
    const taken = db.users.some((u) => u.email === normalized && u.id !== user.id);
    if (taken) return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    db.users[idx].email = normalized;
  }
  if (body.name) db.users[idx].name = body.name.trim();
  await writeDb(db);

  const updated = db.users[idx];
  return NextResponse.json({
    message: "Profile updated",
    user: sanitizeUser(updated),
    token: createToken(updated),
  });
}
