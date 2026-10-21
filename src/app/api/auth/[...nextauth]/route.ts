import { NextResponse } from "next/server";
// Old NextAuth route — replaced by /api/auth/[...all] which uses Better Auth.
export function GET() {
  return NextResponse.json({ error: { code: "NOT_IMPLEMENTED", message: "Use /api/auth/* instead." } }, { status: 410 });
}
export function POST() {
  return NextResponse.json({ error: { code: "NOT_IMPLEMENTED", message: "Use /api/auth/* instead." } }, { status: 410 });
}