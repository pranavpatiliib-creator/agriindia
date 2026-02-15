const mongoose = require("mongoose");

const mspSchema = new mongoose.Schema(
  {
    cropName: { type: String, required: true },
    seasonYear: { type: String, required: true },
    amountPerQuintal: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Msp", mspSchema);
