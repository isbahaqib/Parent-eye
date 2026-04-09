import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createToken, hashPassword, sanitizeUser } from "@/lib/server/auth";
import { readDb, writeDb } from "@/lib/server/store";

export async function POST(req: Request) {
  const { email, password, name } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const db = await readDb();
  if (db.users.some((u) => u.email === normalizedEmail)) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    name: name.trim(),
    role: "parent" as const,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDb(db);

  return NextResponse.json({
    message: "Account created",
    token: createToken(user),
    user: sanitizeUser(user),
  });
}
