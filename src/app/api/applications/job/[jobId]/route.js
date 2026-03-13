import mongoose from "mongoose";
import Application from "@/models/Application";
import { connectDB } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { jobId } = params;
    if (!isValidObjectId(jobId)) {
      return errorResponse("Invalid job id", 400);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query = { jobId };
    if (status) {
      query.status = status;
    }

    await connectDB();

    const applications = await Application.find(query)
      .populate("userId", "name email role")
      .populate("jobId", "title company location")
      .sort({ createdAt: -1 });

    return successResponse(applications, "Job applications fetched successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch job applications", 500);
  }
}
