import { NextResponse, type NextRequest } from "next/server";
import { requireParent, sanitizeUser } from "@/lib/server/auth";

export async function GET(req: NextRequest) {
  const user = await requireParent(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(sanitizeUser(user));
}
