import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/middleware/auth";

function badRequest(message) {
  return Response.json({ message }, { status: 400 });
}

export async function PATCH(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const userId = params?.id;
    if (!userId) {
      return badRequest("User id is required");
    }

    const body = await request.json();
    const updates = {};

    if (typeof body?.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body?.email === "string" && body.email.trim()) {
      updates.email = body.email.trim().toLowerCase();
    }

    if (typeof body?.role === "string" && ["admin", "user"].includes(body.role)) {
      updates.role = body.role;
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("No valid fields to update");
    }

    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    }).select("_id name email role createdAt updatedAt");

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
      { message: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const userId = params?.id;
    if (!userId) {
      return badRequest("User id is required");
    }

    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    return Response.json({ success: true, message: "User deleted" }, { status: 200 });
  } catch (error) {
    return Response.json(
      { message: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
