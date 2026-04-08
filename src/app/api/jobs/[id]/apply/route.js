import mongoose from "mongoose";
import Application from "@/models/Application";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function POST(request, { params }) {
  try {
    const authResult = await requireRole(request, ["user", "admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid job id", 400);
    }

    const body = await request.json();
    const { coverLetter, resume, resumeUrl, cvUrl } = body;
    const normalizedResume = resume || cvUrl || resumeUrl;

    if (!normalizedResume) {
      return errorResponse("resume is required", 400);
    }

    await connectDB();

    const job = await Job.findById(id);
    if (!job) {
      return errorResponse("Job not found", 404);
    }

    const existingApplication = await Application.findOne({
      userId: authResult.user._id,
      jobId: id
    });

    if (existingApplication) {
      return errorResponse("You have already applied for this job", 409);
    }

    const application = await Application.create({
      userId: authResult.user._id,
      jobId: id,
      resume: normalizedResume,
      cvUrl: normalizedResume,
      coverLetter: coverLetter || ""
    });

    return successResponse(application, "Application submitted successfully", 201);
  } catch (error) {
    return errorResponse(error.message || "Failed to apply for job", 500);
  }
}
