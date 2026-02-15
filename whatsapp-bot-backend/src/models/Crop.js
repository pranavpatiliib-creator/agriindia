const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String, enum: ["Kharif", "Rabi", "Cash", "Fruit"], required: true },
    season: { type: String, enum: ["Rabi", "Kharif", "Zaid"], required: true },
    soilType: { type: String, default: "" },
    waterRequirement: { type: String, default: "" },
    durationDays: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
