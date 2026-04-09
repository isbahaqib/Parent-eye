import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { readDb } from "@/lib/server/store";
import type { ParentUser } from "@/lib/server/types";

const SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-me";

type TokenPayload = {
  sub: string;
  email: string;
  role: "parent" | "super_admin";
  exp: number;
};

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(input: string): string {
  return createHmac("sha256", SECRET).update(input).digest("base64url");
}

export function createToken(user: ParentUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  if (parsed.exp < Date.now()) return null;
  return parsed;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [salt, original] = encoded.split(":");
  if (!salt || !original) return false;
  const next = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(original, "hex");
  const b = Buffer.from(next, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sanitizeUser(user: ParentUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function requireParent(req: NextRequest): Promise<ParentUser | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = await readDb();
  return db.users.find((u) => u.id === payload.sub) ?? null;
}
