import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MAX_DB_CONNECT_RETRIES = Number(process.env.DB_CONNECT_RETRIES || 3);
const DB_RETRY_DELAY_MS = Number(process.env.DB_RETRY_DELAY_MS || 1500);

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_DB_CONNECT_RETRIES; attempt += 1) {
    try {
      console.log(
        `[DB] Connecting to MongoDB (attempt ${attempt}/${MAX_DB_CONNECT_RETRIES})...`
      );

      const conn = await mongoose.connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      });

      return conn;
    } catch (error) {
      lastError = error;
      console.error(
        `[DB] MongoDB connect attempt ${attempt} failed: ${error?.message || "unknown error"}`
      );

      if (attempt < MAX_DB_CONNECT_RETRIES) {
        console.warn(`[DB] Retrying in ${DB_RETRY_DELAY_MS}ms...`);
        await delay(DB_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
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
    cached.promise = connectWithRetry();
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;

    const dbError = new Error(error?.message || "Database unavailable");
    dbError.code = "DB_CONNECTION_FAILED";
    throw dbError;
  }
}
