import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/middleware/auth";
import bcrypt from "bcryptjs";

function badRequest(message) {
  return Response.json({ message }, { status: 400 });
}

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

export async function POST(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = typeof body?.role === "string" ? body.role : "user";

    if (!name) {
      return badRequest("Name is required");
    }

    if (!email) {
      return badRequest("Email is required");
    }

    if (!password || password.length < 6) {
      return badRequest("Password must be at least 6 characters");
    }

    if (!["admin", "user"].includes(role)) {
      return badRequest("Role must be admin or user");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json({ message: "User with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    return Response.json(
      {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { message: error?.message || "Failed to save user" },
      { status: error?.code === 11000 ? 409 : 500 }
    );
  }
}
