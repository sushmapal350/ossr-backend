import Application from "@/models/Application";
import { connectDB } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    const query = {};
    if (jobId) {
      query.jobId = jobId;
    }
    if (status) {
      query.status = status;
    }

    await connectDB();

    const applications = await Application.find(query)
      .populate("userId", "name email role")
      .populate("jobId", "title company location")
      .sort({ createdAt: -1 });

    return successResponse(applications, "Applications fetched successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch applications", 500);
  }
}
