const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    provider: { type: String, default: "" },
    interestRate: { type: String, default: "" },
    maxAmount: { type: String, default: "" },
    eligibility: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
