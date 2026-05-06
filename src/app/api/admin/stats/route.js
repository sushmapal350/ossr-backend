import { NextResponse } from "next/server";
import Application from "@/models/Application";
import Job from "@/models/Job";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { errorResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const [totalJobs, totalApplications, totalUsers] = await Promise.all([
      Job.countDocuments({}),
      Application.countDocuments({}),
      User.countDocuments({})
    ]);

    const stats = {
      totalJobs,
      totalApplications,
      totalUsers
    };

    return NextResponse.json(
      {
        success: true,
        message: "Admin stats fetched successfully",
        ...stats,
        data: stats
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error.message || "Failed to fetch admin stats", 500);
  }
}