import { NextResponse } from "next/server";
import Job from "@/models/Job";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/middleware/auth";

const STATIC_LOCATIONS = [
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Noida"
];

function normalizeLocations(values) {
  const unique = new Set();

  for (const value of values) {
    const name = String(value || "").trim();
    if (name) {
      unique.add(name);
    }
  }

  return Array.from(unique)
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      id: index + 1,
      name
    }));
}

export async function GET(request) {
  try {
    const authResult = await requireRole(request, ["admin"]);
    if (authResult.error) {
      return authResult.error;
    }

    await connectDB();

    const dbLocations = await Job.distinct("location", {
      location: { $exists: true, $ne: "" }
    });

    // Combine DB locations with static locations for a richer list
    const allLocations = Array.from(
      new Set([...(dbLocations || []), ...STATIC_LOCATIONS])
    );

    const normalized = normalizeLocations(allLocations);
    return NextResponse.json(normalized, { status: 200 });
  } catch {
    // Fallback to static values for non-critical lookup failures.
    return NextResponse.json(normalizeLocations(STATIC_LOCATIONS), { status: 200 });
  }
}
