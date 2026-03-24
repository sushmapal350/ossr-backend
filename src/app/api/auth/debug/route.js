/**
 * Debug endpoint: Test password comparison
 * 
 * Verifies that bcrypt hashing and comparison work correctly.
 * 
 * Usage (test password hashing):
 *   POST http://localhost:3000/api/auth/debug/hash
 *   Body: { "password": "mypassword" }
 *   
 * Returns:
 *   - Hash of the password
 *   - Verification that hash can be compared successfully
 * 
 * Usage (verify password against stored hash):
 *   POST http://localhost:3000/api/auth/debug/verify
 *   Body: { "email": "admin@test.com", "password": "mypassword" }
 *   
 * Returns:
 *   - User found indicator
 *   - Password match result
 *   - Stored hash
 *   - Input password
 */

import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectDB } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/apiResponse";

const SALT_ROUNDS = 10;

/**
 * Hash a password and verify comparison works
 */
async function handleHashTest(password) {
  console.log("[DEBUG] Testing password hashing and verification");

  if (!password || password.length < 6) {
    return errorResponse("Password must be at least 6 characters", 400);
  }

  try {
    // Hash the password
    console.log(`[DEBUG] Hashing password: "${password}"`);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log(`[DEBUG] Hash created: ${hash}`);

    // Verify it immediately
    const matches = await bcrypt.compare(password, hash);
    console.log(
      `[DEBUG] Immediate comparison result: ${matches ? "MATCHES" : "DOES NOT MATCH"}`
    );

    // Test wrong password
    const wrongMatches = await bcrypt.compare("wrongpassword", hash);
    console.log(
      `[DEBUG] Wrong password comparison: ${wrongMatches ? "MATCHES" : "DOES NOT MATCH"}`
    );

    return successResponse(
      {
        password: password,
        hash: hash,
        correctPasswordMatches: matches,
        wrongPasswordMatches: wrongMatches,
        bcryptWorking: matches && !wrongMatches
      },
      "Password hash test complete"
    );
  } catch (error) {
    console.error("[DEBUG] Hash test failed", error);
    return errorResponse(error?.message || "Hashing failed", 500);
  }
}

/**
 * Verify a password against a stored user hash
 */
async function handleVerifyTest(email, password) {
  console.log(`[DEBUG] Verifying password for email: ${email}`);

  if (!email || !password) {
    return errorResponse("email and password are required", 400);
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!user) {
      console.warn(`[DEBUG] User not found: ${email}`);
      return successResponse(
        {
          userFound: false,
          email: email,
          message: "User does not exist in database"
        },
        "User lookup complete",
        200
      );
    }

    console.log(`[DEBUG] User found: ${user.email}`);
    console.log(`[DEBUG] Stored hash: ${user.password}`);
    console.log(`[DEBUG] Input password: "${password}"`);

    // Compare
    const matches = await bcrypt.compare(password, user.password);
    console.log(
      `[DEBUG] Password comparison result: ${matches ? "MATCHES" : "DOES NOT MATCH"}`
    );

    return successResponse(
      {
        userFound: true,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        storedHash: user.password,
        inputPassword: password,
        passwordMatches: matches,
        reason: matches ? "Login would succeed" : "Login would fail"
      },
      "Password verification complete",
      200
    );
  } catch (error) {
    console.error("[DEBUG] Verify test failed", error);
    return errorResponse(error?.message || "Verification failed", 500);
  }
}

export async function POST(request) {
  try {
    const { pathname } = new URL(request.url);
    const body = await request.json();

    // Determine which test to run based on path
    if (pathname.includes("/debug/hash")) {
      return await handleHashTest(body.password);
    } else if (pathname.includes("/debug/verify")) {
      return await handleVerifyTest(body.email, body.password);
    } else {
      return errorResponse(
        "Unknown debug endpoint. Use /debug/hash or /debug/verify",
        400
      );
    }
  } catch (error) {
    console.error("[DEBUG] Request handling failed", error);
    return errorResponse(
      error?.message || "Request processing failed",
      500
    );
  }
}
