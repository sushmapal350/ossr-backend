const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true
    },
    description: {
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

module.exports = mongoose.models.ExpressCategory || mongoose.model("ExpressCategory", categorySchema);