import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

export async function GET(request) {
  try {
    await connectDB();
        console.log('lllllllllllllllllllllllllllllllllllllllll');

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

    const body = await request.json();
    const { title, company, description, location, category, experienceLevel, salary } = body;

    if (!title || !company || !description || !location || !category || salary === undefined) {
      return errorResponse(
        "title, company, description, location, category and salary are required",
        400
      );
    }

    const normalizedExperienceLevel = experienceLevel
      ? String(experienceLevel).toLowerCase()
      : undefined;
    const allowedExperienceLevels = ["intern", "junior", "mid", "senior", "lead"];

    if (
      normalizedExperienceLevel !== undefined &&
      !allowedExperienceLevels.includes(normalizedExperienceLevel)
    ) {
      return errorResponse(
        "experienceLevel must be one of: intern, junior, mid, senior, lead",
        400
      );
    }

    const numericSalary = Number(salary);
    if (Number.isNaN(numericSalary) || numericSalary < 0) {
      return errorResponse("salary must be a valid non-negative number", 400);
    }

    await connectDB();

    const job = await Job.create({
      title,
      company,
      description,
      location,
      category,
      experienceLevel: normalizedExperienceLevel,
      salary: numericSalary,
      createdBy: authResult.user._id
    });

    return successResponse(job, "Job created successfully", 201);
  } catch (error) {
    return errorResponse(error.message || "Failed to create job", 500);
  }
}
