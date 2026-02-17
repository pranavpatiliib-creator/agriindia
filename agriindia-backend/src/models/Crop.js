const mongoose = require("mongoose");

function localizedString(base) {
  return {
    [base]: String,
    [`${base}_hi`]: String,
    [`${base}_mr`]: String,
  };
}

const fertilizerSchema = new mongoose.Schema(
  {
    ...localizedString("stage"),
    ...localizedString("days_after_sowing"),
    ...localizedString("fertilizer_name"),
    ...localizedString("dosage_per_acre"),
    ...localizedString("application_method"),
    ...localizedString("water_quantity_for_spray"),
  },
  { _id: false, strict: false }
);

const diseaseSchema = new mongoose.Schema(
  {
    ...localizedString("disease_name"),
    ...localizedString("causal_organism"),
    ...localizedString("symptoms"),
    ...localizedString("preventive_measures"),
    ...localizedString("recommended_chemical"),
    ...localizedString("dosage_per_liter"),
    ...localizedString("waiting_period_before_harvest"),
  },
  { _id: false, strict: false }
);

const cropSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    name_hi: String,
    name_mr: String,
    ...localizedString("season"),
    ...localizedString("sowing_time"),
    ...localizedString("harvesting_time"),
    ...localizedString("expected_yield_per_acre_quintals"),
    ...localizedString("seed_quantity_per_acre_kg"),
    ...localizedString("msp_rupees_per_quintal"),
    soil_type: [String],
    soil_type_hi: [String],
    soil_type_mr: [String],
    fertilizer_schedule: [fertilizerSchema],
    major_diseases: [diseaseSchema],
  },
  {
    timestamps: true,
    strict: false,
    minimize: false,
  }
);

module.exports = mongoose.model("Crop", cropSchema);
