import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  const before = db.children.length;
  db.children = db.children.filter((c) => !(c.id === params.childId && c.parentId === user.id));
  if (db.children.length === before) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  await writeDb(db);
  return NextResponse.json({ message: "Child deleted" });
}
