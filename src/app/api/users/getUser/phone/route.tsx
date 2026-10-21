import { NextResponse } from "next/server";
// Old route — being rewritten in Step 7.
export function GET() {
  return NextResponse.json({ error: { code: "NOT_IMPLEMENTED", message: "This endpoint is being rewritten." } }, { status: 501 });
}
