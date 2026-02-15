const mongoose = require("mongoose");

const subsidySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    eligibility: { type: String, default: "" },
    benefit: { type: String, default: "" },
    applyUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subsidy", subsidySchema);
