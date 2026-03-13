import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/apiResponse";

function getConnectionStateLabel(state) {
  switch (state) {
    case 0:
      return "disconnected";
    case 1:
      return "connected";
    case 2:
      return "connecting";
    case 3:
      return "disconnecting";
    default:
      return "unknown";
  }
}

export async function GET() {
  try {
    await connectDB();

    const state = mongoose.connection.readyState;
    const isConnected = state === 1;

    if (!isConnected) {
      return errorResponse(
        "Service is running but database is not ready",
        503,
        {
          service: "ossr-backend",
          db: {
            connected: false,
            state: getConnectionStateLabel(state)
          }
        }
      );
    }

    return successResponse(
      {
        service: "ossr-backend",
        status: "ready",
        db: {
          connected: true,
          state: getConnectionStateLabel(state),
          name: mongoose.connection.name,
          host: mongoose.connection.host
        }
      },
      "Readiness check passed"
    );
  } catch (error) {
    console.error("[HEALTH_READY] Database connectivity check failed", error);

    return errorResponse("Database unavailable", 503, {
      service: "ossr-backend",
      db: {
        connected: false,
        state: getConnectionStateLabel(mongoose.connection.readyState)
      },
      reason: error.message
    });
  }
}
