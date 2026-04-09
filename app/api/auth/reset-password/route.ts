import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Password reset flow is not enabled in local API mode yet.",
  });
}
