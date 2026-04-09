import { NextResponse, type NextRequest } from "next/server";
import { requireParent } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { childId: string } }
) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { website?: string };
  const website = String(body.website || "").trim().toLowerCase();
  if (!website) return NextResponse.json({ error: "website is required" }, { status: 400 });

  const db = await readDb();
  const idx = db.children.findIndex((c) => c.id === params.childId && c.parentId === user.id);
  if (idx < 0) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const child = db.children[idx];
  child.blockedWebsites = (child.blockedWebsites || []).filter((entry) => entry !== website);
  await writeDb(db);

  return NextResponse.json({ message: "Website unblocked", blockedWebsites: child.blockedWebsites });
}
