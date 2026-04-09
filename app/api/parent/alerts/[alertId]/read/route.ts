import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  db.alerts = db.alerts ?? [];
  const idx = db.alerts.findIndex((a) => a.id === params.alertId && a.parentId === user.id);
  if (idx < 0) return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  db.alerts[idx].read = true;
  await writeDb(db);
  return NextResponse.json({ message: "Alert marked as read", alert: db.alerts[idx] });
}
