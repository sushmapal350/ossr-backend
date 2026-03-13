import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { verifyToken } from "@/lib/jwt";
import { errorResponse } from "@/lib/apiResponse";

function getBearerToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}

export async function requireAuth(request) {
  try {
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

  if (!roles.includes(authResult.user.role)) {
    return { error: errorResponse("Forbidden: insufficient privileges", 403) };
  }

  return authResult;
}
