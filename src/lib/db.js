import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in environment variables.");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function registerConnectionEventHandlers() {
  if (global.mongooseEventHandlersRegistered) {
    return;
  }

  mongoose.connection.on("connected", () => {
    console.log("[DB] MongoDB connected");
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("[DB] MongoDB connection error", error);
  });

  global.mongooseEventHandlersRegistered = true;
}

export async function connectDB() {
  registerConnectionEventHandlers();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("[DB] Connecting to MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;

    const dbError = new Error(error.message || "Database unavailable");
    dbError.code = "DB_CONNECTION_FAILED";
    throw dbError;
  }
}
