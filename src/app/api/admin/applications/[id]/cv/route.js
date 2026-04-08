import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Application from "@/models/Application";
import { connectDB } from "@/lib/db";
import { errorResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getFileName(filePathValue) {
  const normalized = String(filePathValue || "");
  return path.basename(normalized) || "cv";
}

function isExternalUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export async function GET(request, { params }) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    const { id } = params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid application id", 400);
    }

    await connectDB();                                                 

    const application = await Application.findById(id).select("cvUrl resume");
    if (!application) {
      return errorResponse("Application not found", 404);
    }

    const cvSource = application.cvUrl || application.resume;
    if (!cvSource) {
      return errorResponse("CV not available for this application", 404);
    }

    if (isExternalUrl(cvSource)) {
      return Response.redirect(cvSource, 302);
    }

    const absolutePath = path.isAbsolute(cvSource)
      ? cvSource
      : path.resolve(process.cwd(), cvSource);

    const fileBuffer = await fs.readFile(absolutePath);
    const fileName = getFileName(absolutePath);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return errorResponse("CV file not found on server", 404);
    }

    return errorResponse(error.message || "Failed to download CV", 500);
  }
}
