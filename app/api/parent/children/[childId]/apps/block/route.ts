import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { appName?: string };
  const appName = String(body.appName || "").trim();
  if (!appName) return NextResponse.json({ error: "appName is required" }, { status: 400 });

  const db = await readDb();
  const idx = db.children.findIndex((c) => c.id === params.childId && c.parentId === user.id);
  if (idx < 0) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const child = db.children[idx];
  child.blockedApps = Array.from(new Set([...(child.blockedApps || []), appName]));
  child.installedApps = Array.from(new Set([...(child.installedApps || []), appName]));
  await writeDb(db);

  return NextResponse.json({ message: "App blocked", blockedApps: child.blockedApps });
}
