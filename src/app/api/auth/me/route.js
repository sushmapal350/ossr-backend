import { requireAuth } from "@/middleware/auth";
import { successResponse } from "@/lib/apiResponse";

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return authResult.error;
  }

  return successResponse(authResult.user, "Current user profile");
}
