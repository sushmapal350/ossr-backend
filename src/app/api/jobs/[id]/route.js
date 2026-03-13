import mongoose from "mongoose";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid job id", 400);
    }

    await connectDB();

    const job = await Job.findById(id).populate("createdBy", "name email");
    if (!job) {
      return errorResponse("Job not found", 404);
    }

    return successResponse(job, "Job details fetched successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch job", 500);
  }
}

export async function PUT(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid job id", 400);
    }

    const body = await request.json();
    const updates = {};

    const updatableFields = [
      "title",
      "company",
      "description",
      "location",
      "category",
      "experienceLevel",
      "salary"
    ];
    updatableFields.forEach((field) => {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    });

    if (updates.experienceLevel !== undefined) {
      const normalizedExperienceLevel = String(updates.experienceLevel).toLowerCase();
      const allowedExperienceLevels = ["intern", "junior", "mid", "senior", "lead"];

      if (!allowedExperienceLevels.includes(normalizedExperienceLevel)) {
        return errorResponse(
          "experienceLevel must be one of: intern, junior, mid, senior, lead",
          400
        );
      }

      updates.experienceLevel = normalizedExperienceLevel;
    }

    if (updates.salary !== undefined) {
      const numericSalary = Number(updates.salary);
      if (Number.isNaN(numericSalary) || numericSalary < 0) {
        return errorResponse("salary must be a valid non-negative number", 400);
      }
      updates.salary = numericSalary;
    }

    await connectDB();

    const updatedJob = await Job.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedJob) {
      return errorResponse("Job not found", 404);
    }

    return successResponse(updatedJob, "Job updated successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to update job", 500);
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid job id", 400);
    }

    await connectDB();

    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      return errorResponse("Job not found", 404);
    }

    return successResponse(null, "Job deleted successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to delete job", 500);
  }
}
