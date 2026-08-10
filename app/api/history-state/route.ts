import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function deprecated() {
  return NextResponse.json(
    { error: "This legacy History state endpoint has been retired. Use /api/history." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = deprecated;
export const PUT = deprecated;
