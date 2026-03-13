import Application from "@/models/Application";
import { connectDB } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["user", "admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const applications = await Application.find({ userId: authResult.user._id })
      .populate("jobId")
      .sort({ createdAt: -1 });

    return successResponse(applications, "User applications fetched successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch applications", 500);
  }
}
