import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { getPortalConfig, portalRequest } from "@/lib/portal";

export const dynamic = "force-dynamic";

// Server-side proxy to the central admin app so the API key never reaches the browser.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!getPortalConfig()) {
    return NextResponse.json({ error: "Admin integration is not configured." }, { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const query: Record<string, string> = {};
  for (const key of ["type", "academicYear", "semester", "department"]) {
    const value = incoming.get(key);
    if (value) query[key] = value.slice(0, 80);
  }

  try {
    const res = await portalRequest("campus", { query });
    const body = await res.json().catch(() => ({ error: "Invalid response from admin app." }));
    return NextResponse.json(body, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "Admin app is unreachable." }, { status: 502 });
  }
}
