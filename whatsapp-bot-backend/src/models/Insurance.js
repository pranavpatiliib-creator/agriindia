const mongoose = require("mongoose");

const insuranceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    provider: { type: String, default: "" },
    coverage: { type: String, default: "" },
    premiumInfo: { type: String, default: "" },
    claimProcess: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Insurance", insuranceSchema);
