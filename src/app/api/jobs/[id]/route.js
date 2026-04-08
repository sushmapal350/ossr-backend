import mongoose from "mongoose";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

const ALLOWED_EXPERIENCE_LEVELS = ["intern", "junior", "mid", "senior", "lead"];
const ALLOWED_JOB_TYPES = ["Full Time", "Part Time", "Remote"];

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value).trim();
}

function normalizeJobType(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return undefined;
  }

  const normalized = String(rawValue).trim().toLowerCase();

  if (normalized === "full time" || normalized === "full-time") {
    return "Full Time";
  }

  if (normalized === "part time" || normalized === "part-time") {
    return "Part Time";
  }

  if (normalized === "remote") {
    return "Remote";
  }

  throw new Error(`jobType must be one of: ${ALLOWED_JOB_TYPES.join(", ")}`);
}

function toApiType(jobType) {
  if (!jobType) {
    return "";
  }

  if (jobType === "Full Time") {
    return "full-time";
  }

  if (jobType === "Part Time") {
    return "part-time";
  }

  return "remote";
}

function normalizeStringArray(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array of strings`);
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

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

    const title = normalizeOptionalString(body.title);
    if (title !== undefined) {
      updates.title = title;
    }

    const company = normalizeOptionalString(body.company);
    if (company !== undefined) {
      updates.company = company;
    }

    const description = normalizeOptionalString(body.description);
    if (description !== undefined) {
      updates.description = description;
    }

    const shortDescription = normalizeOptionalString(body.shortDescription);
    if (shortDescription !== undefined) {
      updates.shortDescription = shortDescription;
    }

    const location = normalizeOptionalString(body.location);
    if (location !== undefined) {
      updates.location = location;
    }

    const category = normalizeOptionalString(body.category);
    if (category !== undefined) {
      updates.category = category;
    }

    const salaryRange = normalizeOptionalString(body.salaryRange);
    if (salaryRange !== undefined) {
      updates.salaryRange = salaryRange;
    }

    const degree = normalizeOptionalString(body.degree);
    if (degree !== undefined) {
      updates.degree = degree;
    }

    const experience = normalizeOptionalString(body.experience);
    if (experience !== undefined) {
      updates.experience = experience;
    }

    if (body.experienceLevel !== undefined) {
      updates.experienceLevel = body.experienceLevel;
    }

    if (body.salary !== undefined) {
      updates.salary = body.salary;
    }

    if (updates.experienceLevel !== undefined) {
      const normalizedExperienceLevel = String(updates.experienceLevel).toLowerCase();

      if (!ALLOWED_EXPERIENCE_LEVELS.includes(normalizedExperienceLevel)) {
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

    if (body.exactSalary !== undefined) {
      const numericExactSalary =
        body.exactSalary === null || body.exactSalary === "" ? null : Number(body.exactSalary);

      if (numericExactSalary !== null && (Number.isNaN(numericExactSalary) || numericExactSalary < 0)) {
        return errorResponse("exactSalary must be a valid non-negative number", 400);
      }

      updates.exactSalary = numericExactSalary;
    }

    try {
      const normalizedJobType = normalizeJobType(body.jobType ?? body.employmentType ?? body.type);
      if (normalizedJobType !== undefined) {
        updates.jobType = normalizedJobType;
        updates.employmentType = normalizedJobType;
        updates.type = toApiType(normalizedJobType);
      }

      const responsibilities = normalizeStringArray(body.responsibilities, "responsibilities");
      if (responsibilities !== undefined) {
        updates.responsibilities = responsibilities;
      }

      const skills = normalizeStringArray(body.skills, "skills");
      if (skills !== undefined) {
        updates.skills = skills;
      }

      const benefits = normalizeStringArray(body.benefits, "benefits");
      if (benefits !== undefined) {
        updates.benefits = benefits;
      }
    } catch (error) {
      return errorResponse(error.message || "Invalid job payload", 400);
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
