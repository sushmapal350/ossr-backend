/**
 * Seed endpoint: Create test admin user
 * 
 * Usage:
 *   POST http://localhost:3000/api/auth/seed
 *   Body: { "email": "admin@test.com", "password": "password123" }
 * 
 * Creates one test admin user if it doesn't already exist.
 * For development only — remove in production.
 */

import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";

const SALT_ROUNDS = 10;

export async function POST(request) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return errorResponse("Invalid JSON body", 400);
    }

    const { email, password } = body;

    // Validate inputs
    if (!email || !password) {
      return errorResponse("email and password are required", 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400);
    }

    // Connect to database
    try {
      await connectDB();
    } catch (error) {
      console.error("[SEED] Database connection failed", error?.message);
      return errorResponse("Database unavailable", 503);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return errorResponse(
        `User with email ${trimmedEmail} already exists`,
        409
      );
    }

    // Hash password
    console.log("[SEED] Hashing password with bcrypt...");
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("[SEED] Password hashed successfully");
    console.log(`[SEED] Original: ${password}`);
    console.log(`[SEED] Hashed: ${hashedPassword}`);

    // Create user
    const user = new User({
      name: email.split("@")[0] || "Test Admin",
      email: trimmedEmail,
      password: hashedPassword,
      role: "admin"
    });

    await user.save();
    console.log("[SEED] User created:", {
      id: user._id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    });

    // Return success response (don't include password)
    return successResponse(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      "User created successfully",
      201
    );
  } catch (error) {
    console.error("[SEED] Unexpected error", error);
    return errorResponse(
      error?.message || "Failed to create user",
      error?.code === 11000 ? 409 : 500
    );
  }
}
