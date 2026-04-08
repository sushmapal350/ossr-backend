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

function normalizeJobType(body) {
  const rawValue = body.jobType ?? body.employmentType ?? body.type;
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

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const company = searchParams.get("company");
    const category = searchParams.get("category");
    const experienceLevel = searchParams.get("experienceLevel");
    const minSalary = searchParams.get("minSalary");
    const maxSalary = searchParams.get("maxSalary");
    const keyword = searchParams.get("keyword");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit;

    const query = {};
    const allowedSortFields = ["createdAt", "salary", "title", "company"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    if (company) {
      query.company = { $regex: company, $options: "i" };
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel.toLowerCase();
    }

    if (minSalary || maxSalary) {
      query.salary = {};
      if (minSalary) {
        query.salary.$gte = Number(minSalary);
      }
      if (maxSalary) {
        query.salary.$lte = Number(maxSalary);
      }
    }

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { company: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }

    const skip = (safePage - 1) * safeLimit;


    

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("createdBy", "name email")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(safeLimit),
      Job.countDocuments(query)
    ]);

    return successResponse(
      {
        jobs,
        pagination: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit)
        },
        filters: {
          location,
          company,
          category,
          experienceLevel,
          minSalary,
          maxSalary,
          keyword,
          sortBy: sortField,
          sortOrder: sortOrder === 1 ? "asc" : "desc"
        }
      },
      "Jobs fetched successfully"
    );
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch jobs", 500);
  }
}

export async function POST(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON payload", 400);
    }

    const {
      title,
      company,
      description,
      location,
      category,
      experienceLevel,
      salary
    } = body;

    const normalizedTitle = String(title || "").trim();
    const normalizedCompany = String(company || "").trim();
    const normalizedDescription = String(description || "").trim();
    const normalizedLocation = String(location || "").trim();
    const normalizedCategory = String(category || "").trim();

    if (
      !normalizedTitle ||
      !normalizedCompany ||
      !normalizedDescription ||
      !normalizedLocation ||
      !normalizedCategory ||
      salary === undefined ||
      salary === null ||
      salary === ""
    ) {
      return errorResponse(
        "title, company, description, location, category and salary are required",
        400
      );
    }

    const normalizedExperienceLevel = experienceLevel
      ? String(experienceLevel).toLowerCase()
      : undefined;

    if (
      normalizedExperienceLevel !== undefined &&
      !ALLOWED_EXPERIENCE_LEVELS.includes(normalizedExperienceLevel)
    ) {
      return errorResponse(
        "experienceLevel must be one of: intern, junior, mid, senior, lead",
        400
      );
    }

    let normalizedJobType;
    let responsibilities;
    let skills;
    let benefits;

    try {
      normalizedJobType = normalizeJobType(body);
      responsibilities = normalizeStringArray(body.responsibilities, "responsibilities");
      skills = normalizeStringArray(body.skills, "skills");
      benefits = normalizeStringArray(body.benefits, "benefits");
    } catch (error) {
      return errorResponse(error.message || "Invalid job payload", 400);
    }

    const numericSalary = Number(salary);
    if (Number.isNaN(numericSalary) || numericSalary < 0) {
      return errorResponse("salary must be a valid non-negative number", 400);
    }

    const normalizedExactSalary =
      body.exactSalary === undefined || body.exactSalary === null || body.exactSalary === ""
        ? null
        : Number(body.exactSalary);

    if (normalizedExactSalary !== null && (Number.isNaN(normalizedExactSalary) || normalizedExactSalary < 0)) {
      return errorResponse("exactSalary must be a valid non-negative number", 400);
    }

    await connectDB();

    const job = await Job.create({
      title: normalizedTitle,
      company: normalizedCompany,
      description: normalizedDescription,
      shortDescription: normalizeOptionalString(body.shortDescription) || normalizedDescription,
      location: normalizedLocation,
      category: normalizedCategory,
      jobType: normalizedJobType || "",
      type: toApiType(normalizedJobType),
      employmentType: normalizedJobType || "",
      experience: normalizeOptionalString(body.experience) || normalizedExperienceLevel || "",
      experienceLevel: normalizedExperienceLevel,
      salaryRange: normalizeOptionalString(body.salaryRange) || "",
      exactSalary: normalizedExactSalary,
      salary: numericSalary,
      degree: normalizeOptionalString(body.degree) || "",
      responsibilities: responsibilities || [],
      skills: skills || [],
      benefits: benefits || [],
      createdBy: authResult.user._id
    });

    return successResponse(job, "Job created successfully", 201);
  } catch (error) {
    if (error?.name === "ValidationError") {
      const validationMessages = Object.values(error.errors || {}).map(
        (entry) => entry?.message
      ).filter(Boolean);

      return errorResponse(
        validationMessages[0] || "Job validation failed",
        400,
        validationMessages
      );
    }

    if (error?.name === "CastError") {
      return errorResponse("Invalid payload format", 400);
    }

    return errorResponse(error.message || "Failed to create job", 500);
  }
}
