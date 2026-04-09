import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { AppDb, ParentUser } from "@/lib/server/types";
import { hashPassword } from "@/lib/server/auth";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app-db.json");

const defaultDb: AppDb = {
  users: [],
  children: [],
  linkCodes: [],
  alerts: [],
};

async function ensureSeedUser(db: AppDb): Promise<AppDb> {
  let nextDb: AppDb = {
    ...db,
    linkCodes: db.linkCodes ?? [],
    alerts: db.alerts ?? [],
  };

  let nextUsers: ParentUser[] = nextDb.users.map((u): ParentUser => ({
    ...u,
    role: u.role === "super_admin" ? "super_admin" : "parent",
  }));
  const now = new Date().toISOString();
  const hasParent = nextUsers.some((u) => u.email === "parent@example.com");
  const hasSuperAdmin = nextUsers.some((u) => u.role === "super_admin");

  if (!hasParent) {
    const seededParent: ParentUser = {
      id: randomUUID(),
      email: "parent@example.com",
      name: "Default Parent",
      role: "parent",
      passwordHash: hashPassword("Parent@123"),
      createdAt: now,
    };
    nextUsers = [...nextUsers, seededParent];
  }

  if (!hasSuperAdmin) {
    const seededAdmin: ParentUser = {
      id: randomUUID(),
      email: "admin@parenteye.com",
      name: "Super Admin",
      role: "super_admin",
      passwordHash: hashPassword("Admin@123"),
      createdAt: now,
    };
    nextUsers = [...nextUsers, seededAdmin];
  }

  nextDb = { ...nextDb, users: nextUsers };
  return nextDb;
}

export async function readDb(): Promise<AppDb> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as AppDb;
    const seeded = await ensureSeedUser(parsed);
    if (seeded !== parsed) await writeDb(seeded);
    return seeded;
  } catch {
    const seeded = await ensureSeedUser(defaultDb);
    await writeDb(seeded);
    return seeded;
  }
}

export async function writeDb(next: AppDb): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(next, null, 2), "utf8");
}
