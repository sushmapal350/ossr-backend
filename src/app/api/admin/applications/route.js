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
    const status = searchParams.get("status");
    const jobId = searchParams.get("jobId");

    const query = {};
    if (status) {
      query.status = status;
    }
    if (jobId) {
      query.jobId = jobId;
    }

    await connectDB();

    const applications = await Application.find(query)
      .populate("userId", "name")
      .populate("jobId", "title description shortDescription longDescription")
      .sort({ createdAt: -1 });

    const formatted = applications.map((application) => {
      const rawLongDescription =
        application.jobId?.longDescription || application.jobId?.description || "";
      const rawShortDescription =
        application.jobId?.shortDescription ||
        (rawLongDescription.length > 140
          ? `${rawLongDescription.slice(0, 137)}...`
          : rawLongDescription);

      return {
        id: application._id,
        applicantName: application.userId?.name || "Unknown",
        jobTitle: application.jobId?.title || "Unknown",
        jobShortDescription: rawShortDescription,
        jobLongDescription: rawLongDescription,
        status: application.status,
        appliedAt: application.date || application.createdAt,
        cvUrl: application.cvUrl || application.resume || ""
      };
    });

    return successResponse(formatted, "Admin applications fetched successfully");
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch admin applications", 500);
  }
}
