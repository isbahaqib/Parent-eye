import { NextResponse } from "next/server";
import { createToken, sanitizeUser, verifyPassword } from "@/lib/server/auth";
import { readDb } from "@/lib/server/store";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = await readDb();
  const user = db.users.find((u) => u.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ token: createToken(user), user: sanitizeUser(user) });
}
