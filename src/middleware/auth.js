import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { errorResponse } from "@/lib/apiResponse";
import bcrypt from "bcryptjs";

function isDevAuthBypassEnabled() {
  const isNonProduction = process.env.NODE_ENV !== "production";
  const bypassFlag = process.env.AUTH_BYPASS_TOKEN_VALIDATION === "true";
  return isNonProduction && bypassFlag;
}

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}

async function getBypassUser() {
  let devUser = await User.findOne({ role: "admin" }).select("-password");
  if (devUser) {
    return devUser;
  }

  const devEmail = process.env.DEV_BYPASS_ADMIN_EMAIL || "dev-admin@local.dev";
  const existingDevUser = await User.findOne({ email: devEmail }).select("-password");
  if (existingDevUser) {
    return existingDevUser;
  }

  const passwordHash = await bcrypt.hash("dev-only-password", 10);
  const created = await User.create({
    name: "Dev Admin",
    email: devEmail,
    password: passwordHash,
    role: "admin"
  });

  return User.findById(created._id).select("-password");
}

export async function requireAuth(request) {
  try {
    if (isDevAuthBypassEnabled()) {
      await connectDB();

      const devUser = await getBypassUser();
      return { user: devUser };
    }

    const token = getBearerToken(request);

    if (!token) {
      return { error: errorResponse("Authorization token missing", 401) };
    }

    const decoded = verifyToken(token);
    await connectDB();

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return { error: errorResponse("User not found", 401) };
    }

    return { user };
  } catch (error) {
    return { error: errorResponse("Invalid or expired token", 401) };
  }
}

export async function requireRole(request, roles = []) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return authResult;
  }

  if (isDevAuthBypassEnabled()) {
    return authResult;
  }

  if (!roles.includes(authResult.user.role)) {
    return { error: errorResponse("Forbidden: insufficient privileges", 403) };
  }

  return authResult;
}
