import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/middleware/auth";

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const users = await User.find({})
      .select("_id name email role createdAt")
      .sort({ createdAt: -1 });

    const response = users.map((user, index) => ({
      _id: user._id.toString(),
      id: index + 1,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : null
    }));

    return Response.json(response, { status: 200 });
  } catch {
    return Response.json({ message: "Failed to load users" }, { status: 500 });
  }
}
