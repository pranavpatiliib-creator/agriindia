const mongoose = require("mongoose");

const diseaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cropName: { type: String, required: true },
    symptoms: { type: String, default: "" },
    prevention: { type: String, default: "" },
    treatment: { type: String, default: "" },
    recommendedFertilizer: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Disease", diseaseSchema);
