import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { signToken } from "@/lib/jwt";
import { errorResponse, successResponse } from "@/lib/apiResponse";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (EMAIL_REGEX.test(normalizedIdentifier)) {
    return User.findOne({ email: normalizedIdentifier }).select("+password");
  }

  const localPartPattern = new RegExp(`^${escapeRegex(normalizedIdentifier)}@`, "i");

  return User.findOne({
    $or: [
      { email: localPartPattern },
      { name: new RegExp(`^${escapeRegex(identifier.trim())}$`, "i") }
    ]
  }).select("+password");
}

export async function POST(request) {
  let body;
  console.log('request body', request.body);

  try {
    body = await request.json();
  } catch (error) {
    console.error("[LOGIN_API] Invalid JSON body", error);
    return errorResponse("Invalid request body. Please send valid JSON.", 400);
  }

  try {
    const identifier = typeof body?.email === "string"
      ? body.email.trim()
      : typeof body?.username === "string"
        ? body.username.trim()
        : typeof body?.identifier === "string"
          ? body.identifier.trim()
          : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!identifier || !password) {
      return errorResponse("email or username and password are required", 400);
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    try {
      await connectDB();
    } catch (error) {
      console.error("[LOGIN_API] Database connection failed", {
        code: error?.code,
        message: error?.message
      });
      return errorResponse("Database unavailable", 503);
    }

    const user = await findUserByIdentifier(identifier);
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
