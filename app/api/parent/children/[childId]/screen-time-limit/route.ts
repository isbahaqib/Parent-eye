import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { limitMinutes?: number };
  const limitMinutes = Number(body.limitMinutes);
  if (!Number.isFinite(limitMinutes) || limitMinutes < 1) {
    return NextResponse.json({ error: "Valid limitMinutes is required" }, { status: 400 });
  }

  const db = await readDb();
  const idx = db.children.findIndex((c) => c.id === params.childId && c.parentId === user.id);
  if (idx < 0) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  db.children[idx].screenTimeLimitMinutes = limitMinutes;
  await writeDb(db);
  return NextResponse.json({
    message: "Screen-time limit updated",
    child: { id: db.children[idx].id, screenTimeLimitMinutes: db.children[idx].screenTimeLimitMinutes },
  });
}
