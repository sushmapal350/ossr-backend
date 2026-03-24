const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
}

module.exports = connectDB;
