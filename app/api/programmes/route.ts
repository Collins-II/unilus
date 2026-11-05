import { NextResponse } from "next/server";
import { portalRequest, PortalError } from "@/lib/portal";
import { apiErrorResponse } from "@/lib/database/errors";

export async function GET() {
  try {
    const response = await portalRequest("programmes");
    const body = await response.json();
    if (!response.ok) return NextResponse.json({ error: body.error || "Study programmes are unavailable." }, { status: response.status });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PortalError) return NextResponse.json({ error: error.message }, { status: error.status });
    return apiErrorResponse(error, "programmes.get", "Unable to load study programmes.");
  }
}
