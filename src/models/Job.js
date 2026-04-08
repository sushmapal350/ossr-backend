import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      trim: true,
      default: ""
    },
    employmentType: {
      type: String,
      trim: true,
      default: ""
    },
    jobType: {
      type: String,
      enum: ["Full Time", "Part Time", "Remote", ""],
      default: ""
    },
    experienceLevel: {
      type: String,
      enum: ["intern", "junior", "mid", "senior", "lead"],
      default: "mid"
    },
    experience: {
      type: String,
      trim: true,
      default: ""
    },
    salary: {
      type: Number,
      required: true,
      min: 0
    },
    salaryRange: {
      type: String,
      trim: true,
      default: ""
    },
    exactSalary: {
      type: Number,
      min: 0,
      default: null
    },
    shortDescription: {
      type: String,
      trim: true,
      default: ""
    },
    degree: {
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export default Job;
