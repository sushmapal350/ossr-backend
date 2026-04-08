import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/middleware/auth";

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const userId = params?.id;
    if (!userId) {
      return Response.json({ message: "User id is required" }, { status: 400 });
    }

    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role.trim().toLowerCase() : "";

    if (!["admin", "user"].includes(role)) {
      return Response.json({ message: "Role must be admin or user" }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("_id name email role createdAt updatedAt");

    if (!updated) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    return Response.json(
      {
        _id: updated._id.toString(),
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { message: error?.message || "Failed to update role" },
      { status: 500 }
    );
  }
}
