import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/server/store";

export async function POST(req: Request) {
  const { email } = (await req.json().catch(() => ({}))) as { email?: string };
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const db = await readDb();
  db.passwordResetTokens = db.passwordResetTokens ?? [];
  const user = db.users.find((item) => item.email === normalizedEmail);
  const genericMessage = "If an account exists with this email, a reset link has been generated.";

  if (!user) {
    return NextResponse.json({ message: genericMessage });
  }

  const now = Date.now();
  db.passwordResetTokens = db.passwordResetTokens.filter(
    (item) => !item.used && new Date(item.expiresAt).getTime() > now
  );

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(now + 1000 * 60 * 15).toISOString();
  db.passwordResetTokens.push({
    id: randomUUID(),
    userId: user.id,
    token,
    expiresAt,
    used: false,
    createdAt: new Date(now).toISOString(),
  });
  await writeDb(db);

  return NextResponse.json({
    message: genericMessage,
    resetToken: token,
    resetUrl: `/reset-password?token=${token}`,
  });
}
