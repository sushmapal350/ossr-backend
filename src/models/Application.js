import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true
    },
    resume: {
      type: String,
      required: true,
      trim: true
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },
    status: {
      type: String,
      enum: ["applied", "reviewed", "shortlisted", "rejected"],
      default: "applied"
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

applicationSchema.index({ userId: 1, jobId: 1 }, { unique: true });

const Application =
  mongoose.models.Application || mongoose.model("Application", applicationSchema);

export default Application;
