const mongoose = require("mongoose");

function localizedString(base) {
  return {
    [base]: String,
    [`${base}_hi`]: String,
    [`${base}_mr`]: String,
  };
}

const fertilizerScheduleSchema = new mongoose.Schema(
  {
    ...localizedString("stage"),
    ...localizedString("application_period"),
    ...localizedString("fertilizer_name"),
    ...localizedString("dosage_per_acre"),
    ...localizedString("application_method"),
    ...localizedString("water_quantity_for_spray"),
  },
  { _id: false, strict: false }
);

const irrigationScheduleSchema = new mongoose.Schema(
  {
    ...localizedString("growth_stage"),
    ...localizedString("interval_days"),
    ...localizedString("water_requirement"),
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

const pestSchema = new mongoose.Schema(
  {
    ...localizedString("pest_name"),
    ...localizedString("damage_symptoms"),
    ...localizedString("recommended_insecticide"),
    ...localizedString("dosage_per_liter"),
    ...localizedString("waiting_period_before_harvest"),
  },
  { _id: false, strict: false }
);

const cashCropSchema = new mongoose.Schema(
  {
    crop_name: { type: String, required: true, unique: true },
    crop_name_hi: String,
    crop_name_mr: String,
    ...localizedString("name"),
    ...localizedString("crop_type"),
    ...localizedString("season"),
    ...localizedString("crop_nature"),
    ...localizedString("sowing_or_planting_time"),
    ...localizedString("harvesting_time"),
    ...localizedString("expected_yield_per_acre_quintals"),
    ...localizedString("planting_material_quantity_per_acre"),
    ...localizedString("average_market_price_rupees_per_quintal"),
    ...localizedString("estimated_cost_of_cultivation_per_acre"),
    ...localizedString("average_profit_margin_percentage"),
    fertilizer_schedule: [fertilizerScheduleSchema],
    irrigation_schedule: [irrigationScheduleSchema],
    major_diseases: [diseaseSchema],
    major_pests: [pestSchema],
  },
  {
    timestamps: true,
    strict: false,
    minimize: false,
  }
);

module.exports = mongoose.model("CashCrop", cashCropSchema);
