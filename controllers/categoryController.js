const mongoose = require("mongoose");
const Category = require("../models/categoryModel");

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

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildCategoryLookup(identifier) {
  const normalizedIdentifier = typeof identifier === "string" ? identifier.trim() : "";
  if (!normalizedIdentifier) {
    throw createError(400, "Category identifier is required");
  }

  if (mongoose.Types.ObjectId.isValid(normalizedIdentifier)) {
    return { _id: normalizedIdentifier };
  }

  return { slug: slugify(normalizedIdentifier) };
}

async function ensureUniqueSlug(slug, excludeId) {
  const query = { slug };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existingCategory = await Category.findOne(query).select("_id");
  if (existingCategory) {
    throw createError(409, "slug must be unique");
  }
}

async function buildCategoryPayload(body, { requireName, currentCategoryId } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createError(400, "Request body must be a JSON object");
  }

  const payload = {};

  if (body.name !== undefined) {
    payload.name = normalizeString(body.name, "name");
    if (!payload.name) {
      throw createError(400, "name is required");
    }
  }

  if (body.description !== undefined) {
    payload.description = normalizeString(body.description, "description");
  }

  if (body.slug !== undefined) {
    const normalizedSlug = slugify(normalizeString(body.slug, "slug"));
    if (!normalizedSlug) {
      throw createError(400, "slug must contain letters or numbers");
    }
    payload.slug = normalizedSlug;
  } else if (payload.name) {
    payload.slug = slugify(payload.name);
  }

  if (body.createdAt !== undefined) {
    const createdAt = new Date(body.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw createError(400, "createdAt must be a valid date");
    }
    payload.createdAt = createdAt;
  }

  if (requireName && !payload.name) {
    throw createError(400, "name is required");
  }

  if (payload.slug) {
    await ensureUniqueSlug(payload.slug, currentCategoryId);
  }

  return payload;
}

async function getCategories(_req, res, next) {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

async function getCategoryById(req, res, next) {
  try {
    const { id } = req.params;
    const category = await Category.findOne(buildCategoryLookup(id));
    if (!category) {
      throw createError(404, "Category not found");
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const payload = await buildCategoryPayload(req.body, { requireName: true });
    const category = await Category.create(payload);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    next(error);
  }
}

async function updateCategory(req, res, next) {
  try {
    const { id } = req.params;

    const existingCategory = await Category.findOne(buildCategoryLookup(id)).select("_id");
    if (!existingCategory) {
      throw createError(404, "Category not found");
    }

    const payload = await buildCategoryPayload(req.body, { currentCategoryId: existingCategory._id });
    if (Object.keys(payload).length === 0) {
      throw createError(400, "Provide at least one field to update");
    }

    const updatedCategory = await Category.findByIdAndUpdate(existingCategory._id, payload, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory
    });
  } catch (error) {
    next(error);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findOneAndDelete(buildCategoryLookup(id));
    if (!deletedCategory) {
      throw createError(404, "Category not found");
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};