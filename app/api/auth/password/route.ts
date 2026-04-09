import { NextResponse, type NextRequest } from "next/server";
import { hashPassword, requireParent, verifyPassword } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function PATCH(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "currentPassword and newPassword are required" },
      { status: 400 }
    );
  }
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const db = await readDb();
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx < 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
  db.users[idx].passwordHash = hashPassword(newPassword);
  await writeDb(db);
  return NextResponse.json({ message: "Password updated" });
}
