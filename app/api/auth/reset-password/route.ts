import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function POST(req: Request) {
  const { token, password } = (await req.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };

  const resetToken = String(token ?? "").trim();
  const nextPassword = String(password ?? "");
  if (!resetToken || !nextPassword) {
    return NextResponse.json({ error: "token and password are required" }, { status: 400 });
  }
  if (!isStrongPassword(nextPassword)) {
    return NextResponse.json(
      {
        error: "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      },
      { status: 400 }
    );
  }

  const db = await readDb();
  db.passwordResetTokens = db.passwordResetTokens ?? [];
  const entry = db.passwordResetTokens.find((item) => item.token === resetToken);
  if (!entry || entry.used || new Date(entry.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  const user = db.users.find((item) => item.id === entry.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found for reset token" }, { status: 404 });
  }

  user.passwordHash = hashPassword(nextPassword);
  entry.used = true;
  await writeDb(db);

  return NextResponse.json({ message: "Password reset successfully" });
}
