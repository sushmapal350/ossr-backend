const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
      trim: true
    },
    category: {
      type: String,
      required: [true, "category is required"],
      trim: true
    },
    experience: {
      type: String,
      trim: true,
      default: ""
    },
    jobType: {
      type: String,
      required: [true, "jobType is required"],
      trim: true
    },
    salaryRange: {
      type: String,
      trim: true,
      default: ""
    },
    exactSalary: {
      type: String,
      trim: true,
      default: ""
    },
    location: {
      type: String,
      required: [true, "location is required"],
      trim: true
    },
    shortDescription: {
      type: String,
      trim: true,
      default: ""
    },
    responsibilities: {
      type: [String],
      default: []
    },
    skills: {
      type: [String],
      default: []
    },
    benefits: {
      type: [String],
      default: []
    },
    degree: {
      type: String,
      trim: true,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false,
    timestamps: {
      createdAt: false,
      updatedAt: true
    }
  }
);

module.exports = mongoose.models.ExpressJob || mongoose.model("ExpressJob", jobSchema);