import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "If an account exists with this email, a reset link has been generated.",
  });
}
