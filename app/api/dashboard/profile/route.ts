import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/database";
import { apiErrorResponse } from "@/lib/database/errors";
import User from "@/lib/database/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone || "",
        department: user.department || "",
        program: user.program || "",
        campus: user.campus ?? null,
        year: user.year || "",
        role: user.role,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "dashboard.profile.get", "Unable to load your profile right now.");
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) ||
        (body.name !== undefined && typeof body.name !== "string") ||
        (body.phone !== undefined && typeof body.phone !== "string")) {
      return NextResponse.json({ error: "Provide valid text contact details." }, { status: 422 });
    }
    const updates = {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
    };

    await connectToDatabase();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if ((body.program !== undefined && body.program !== user.program) || (body.department !== undefined && body.department !== user.department) || (body.year !== undefined && body.year !== user.year) || body.campus !== undefined) {
      return NextResponse.json({ error: "Study programme, year, department and campus are managed by administrators. Contact campus staff for reassignment." }, { status: 403 });
    }

    if (updates.name !== undefined) {
      if (!updates.name || updates.name.length > 120) return NextResponse.json({ error: "Name must contain 1-120 characters." }, { status: 422 });
      user.name = updates.name;
    }
    if (updates.phone !== undefined) {
      if (updates.phone.length > 30) return NextResponse.json({ error: "Phone must not exceed 30 characters." }, { status: 422 });
      user.phone = updates.phone;
    }

    await user.save();

    return NextResponse.json({
      message: "Profile updated successfully.",
      profile: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        phone: user.phone || "",
        department: user.department || "",
        program: user.program || "",
        campus: user.campus ?? null,
        year: user.year || "",
        role: user.role,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "dashboard.profile.update", "Unable to update your profile right now.");
  }
}
