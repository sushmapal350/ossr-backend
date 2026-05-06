import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

export { POST } from "@/app/api/jobs/route";

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);
    const keyword = searchParams.get("keyword");
    const company = searchParams.get("company");
    const location = searchParams.get("location");
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = Number.isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit;

    const allowedSortFields = ["createdAt", "salary", "title", "company"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const query = {};

    if (company) {
      query.company = { $regex: company, $options: "i" };
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
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
        .populate("createdBy", "name email role")
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
          keyword,
          company,
          location,
          category,
          sortBy: sortField,
          sortOrder: sortOrder === 1 ? "asc" : "desc"
        }
      },
      "Admin jobs fetched successfully"
    );
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch admin jobs", 500);
  }
}
