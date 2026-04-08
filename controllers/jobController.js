const mongoose = require("mongoose");
const Job = require("../models/jobModel");

const REQUIRED_FIELDS = ["title", "category", "jobType", "location"];
const STRING_FIELDS = [
  "title",
  "category",
  "experience",
  "jobType",
  "salaryRange",
  "exactSalary",
  "location",
  "shortDescription",
  "degree"
];
const ARRAY_FIELDS = ["responsibilities", "skills", "benefits"];

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeString(value, fieldName) {
  if (typeof value !== "string") {
    throw createError(400, `${fieldName} must be a string`);
  }

  return value.trim();
}

function normalizeStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw createError(400, `${fieldName} must be an array of strings`);
  }

  const normalizedItems = value.map((item) => {
    if (typeof item !== "string") {
      throw createError(400, `${fieldName} must contain only strings`);
    }

    const trimmedItem = item.trim();
    if (!trimmedItem) {
      throw createError(400, `${fieldName} cannot contain empty values`);
    }

    return trimmedItem;
  });

  return normalizedItems;
}

function buildJobPayload(body, { requireRequiredFields }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError(400, "Request body must be a JSON object");
  }

  const payload = {};

  STRING_FIELDS.forEach((fieldName) => {
    if (body[fieldName] !== undefined) {
      payload[fieldName] = normalizeString(body[fieldName], fieldName);
    }
  });

  ARRAY_FIELDS.forEach((fieldName) => {
    if (body[fieldName] !== undefined) {
      payload[fieldName] = normalizeStringArray(body[fieldName], fieldName);
    }
  });

  if (body.createdAt !== undefined) {
    const createdAt = new Date(body.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw createError(400, "createdAt must be a valid date");
    }
    payload.createdAt = createdAt;
  }

  if (requireRequiredFields) {
    REQUIRED_FIELDS.forEach((fieldName) => {
      if (!payload[fieldName]) {
        throw createError(400, `${fieldName} is required`);
      }
    });
  }

  return payload;
}

async function getJobs(_req, res, next) {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs
    });
  } catch (error) {
    next(error);
  }
}

async function getJobById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid job id");
    }

    const job = await Job.findById(id);
    if (!job) {
      throw createError(404, "Job not found");
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    next(error);
  }
}

async function createJob(req, res, next) {
  try {
    const payload = buildJobPayload(req.body, { requireRequiredFields: true });
    const job = await Job.create(payload);

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job
    });
  } catch (error) {
    next(error);
  }
}

async function updateJob(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid job id");
    }

    const payload = buildJobPayload(req.body, { requireRequiredFields: false });
    if (Object.keys(payload).length === 0) {
      throw createError(400, "Provide at least one field to update");
    }

    const updatedJob = await Job.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true
    });

    if (!updatedJob) {
      throw createError(404, "Job not found");
    }

    res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: updatedJob
    });
  } catch (error) {
    next(error);
  }
}

async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid job id");
    }

    const deletedJob = await Job.findByIdAndDelete(id);
    if (!deletedJob) {
      throw createError(404, "Job not found");
    }

    res.status(200).json({
      success: true,
      message: "Job deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob
};