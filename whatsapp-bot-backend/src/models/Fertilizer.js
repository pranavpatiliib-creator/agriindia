const mongoose = require("mongoose");

const fertilizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cropName: { type: String, required: true },
    stage: { type: String, default: "" },
    dosagePerAcre: { type: String, default: "" },
    method: { type: String, default: "" },
    bestTime: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Fertilizer", fertilizerSchema);
