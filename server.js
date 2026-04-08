require("dotenv").config();
if (!process.env.MONGODB_URI) {
  require("dotenv").config({ path: ".env.local" });
}

const cors = require("cors");
const mongoose = require("mongoose");
const express = require("express");
const connectDB = require("./config/db");
const categoryRoutes = require("./routes/categoryRoutes");
const jobRoutes = require("./routes/jobRoutes");

const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:4200,http://localhost:3500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function createAppServer() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
      }
    })
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Job portal backend is running"
    });
  });

  app.use("/api/jobs", jobRoutes);
  app.use("/api/categories", categoryRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  app.use((error, _req, res, _next) => {
    if (error?.message === "Origin not allowed by CORS") {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    if (error?.type === "entity.parse.failed") {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON payload"
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors)
          .map((validationError) => validationError.message)
          .join(", ")
      });
    }

    if (error?.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `${duplicateField} must be unique`
      });
    }

    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${error.path}`
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  });

  return app;
}

connectDB()
  .then(() => {
    const server = createAppServer();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed due to DB connection error:", error.message);
    process.exit(1);
  });
