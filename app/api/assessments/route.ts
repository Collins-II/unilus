import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { portalRequest, PortalError } from "@/lib/portal";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), assessmentId: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
  z.object({ action: z.literal("submit"), assessmentId: z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
  z.object({ action: z.literal("answer"), assessmentId: z.string().regex(/^[a-f\d]{24}$/i), question: z.number().int().min(0).max(99), option: z.number().int().min(0).max(5) }).strict(),
]);
async function proxy(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.studentId) return NextResponse.json({ error: "Sign in with a student account." }, { status: 401 });
  try {
    const studentId = session.user.studentId;
    const response = request.method === "GET" ? await portalRequest("assessments", { query: { studentId } }) : await portalRequest("assessments", { method: "POST", body: { ...bodySchema.parse(await request.json()), studentId } });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Invalid assessment action." }, { status: 422 });
    console.error("Assessment integration failed:", error);
    return NextResponse.json({ error: error instanceof PortalError ? error.message : "Assessment service response is invalid." }, { status: error instanceof PortalError ? error.status : 502 });
  }
}
export const GET = proxy;
export const POST = proxy;
