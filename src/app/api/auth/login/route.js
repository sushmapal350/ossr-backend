import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { errorResponse, successResponse } from "@/lib/apiResponse";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (error) {
    console.error("[LOGIN_API] Invalid JSON body", error);
    return errorResponse("Invalid request body. Please send valid JSON.", 400);
  }

  try {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return errorResponse("email and password are required", 400);
    }

    if (!EMAIL_REGEX.test(email)) {
      return errorResponse("Please provide a valid email address", 400);
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    try {
      await connectDB();
    } catch (error) {
      console.error("[LOGIN_API] Database connection failed", error);
      return errorResponse("Database unavailable", 503);
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return errorResponse("Invalid email or password", 401);
    }

    const token = signToken({ userId: user._id, role: user.role });

    return successResponse(
      {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      "Login successful"
    );
  } catch (error) {
    console.error("[LOGIN_API] Unexpected error", error);
    return errorResponse(error.message || "Failed to login", 500);
  }
}
