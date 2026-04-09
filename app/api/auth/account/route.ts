import { NextResponse, type NextRequest } from "next/server";
import { requireParent, sanitizeUser } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user: sanitizeUser(user) });
}

export async function DELETE(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  db.children = db.children.filter((c) => c.parentId !== user.id);
  db.users = db.users.filter((u) => u.id !== user.id);
  await writeDb(db);
  return NextResponse.json({ message: "Account deleted" });
}
