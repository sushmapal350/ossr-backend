import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Application from "@/models/Application";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";
import { requireRole } from "@/middleware/auth";

const allowedResumeExtensions = new Set([".pdf", ".doc", ".docx"]);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getFileExtension(fileName = "") {
  return path.extname(String(fileName)).toLowerCase();
}

function sanitizeFileName(fileName = "resume") {
  const extension = getFileExtension(fileName);
  const baseName = path
    .basename(String(fileName), extension)
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "resume"}${extension}`;
}

async function saveResumeFile(file) {
  const extension = getFileExtension(file.name);``

  if (!allowedResumeExtensions.has(extension)) {
    throw new Error("Resume must be a PDF, DOC, or DOCX file");
  }
 
  const uploadDir = path.join(process.cwd(), "uploads", "resumes");
  await fs.mkdir(uploadDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const savedFileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const filePath = path.join(uploadDir, savedFileName);

  await fs.writeFile(filePath, fileBuffer);

  return filePath;
}

async function parseApplicationRequest(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const resumeFile = formData.get("resume");
    const coverLetter = formData.get("coverLetter");

    if (!(resumeFile instanceof File) || resumeFile.size === 0) {
      return {
        coverLetter: typeof coverLetter === "string" ? coverLetter : "",
        resume: ""
      };
    }

    return {
      coverLetter: typeof coverLetter === "string" ? coverLetter : "",
      resume: await saveResumeFile(resumeFile)
    };
  }

  const body = await request.json();
  const { coverLetter, resume, resumeUrl, cvUrl } = body;

  return {
    coverLetter: coverLetter || "",
    resume: resume || cvUrl || resumeUrl || ""
  };
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

    const { coverLetter, resume: normalizedResume } = await parseApplicationRequest(request);

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
