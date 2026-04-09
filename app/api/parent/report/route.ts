import { NextResponse, type NextRequest } from "next/server";
import { requireParent, sanitizeUser } from "@/lib/server/auth";
import { readDb } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await readDb();
  const usersInScope = user.role === "super_admin" ? db.users : db.users.filter((u) => u.id === user.id);
  const parents = usersInScope.map((u) => sanitizeUser(u));
  const childrenInScope =
    user.role === "super_admin" ? db.children : db.children.filter((c) => c.parentId === user.id);
  const children = childrenInScope.map((c) => {
    const parent = db.users.find((u) => u.id === c.parentId);
    return {
      ...c,
      parentName: parent?.name ?? "Unknown Parent",
      parentEmail: parent?.email ?? "",
    };
  });

  return NextResponse.json({
    summary: {
      totalParents: parents.length,
      totalChildren: children.length,
    },
    isSuperAdmin: user.role === "super_admin",
    parents,
    children,
  });
}
