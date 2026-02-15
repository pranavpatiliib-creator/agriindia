const mongoose = require("mongoose");

const fertilizerScheduleSchema = new mongoose.Schema({
  stage: String,
  application_period: String,
  fertilizer_name: String,
  dosage_per_acre: String,
  application_method: String,
  water_quantity_for_spray: String
}, { _id: false, strict: false });

const irrigationScheduleSchema = new mongoose.Schema({
  growth_stage: String,
  interval_days: String,
  water_requirement: String
}, { _id: false, strict: false });

const diseaseSchema = new mongoose.Schema({
  disease_name: String,
  causal_organism: String,
  symptoms: String,
  preventive_measures: String,
  recommended_chemical: String,
  dosage_per_liter: String,
  waiting_period_before_harvest: String
}, { _id: false, strict: false });

const pestSchema = new mongoose.Schema({
  pest_name: String,
  damage_symptoms: String,
  recommended_insecticide: String,
  dosage_per_liter: String,
  waiting_period_before_harvest: String
}, { _id: false, strict: false });

const fruitCropSchema = new mongoose.Schema({
  crop_name: { type: String, required: true, unique: true },
  crop_type: String,
  season: String,
  crop_nature: String,
  sowing_or_planting_time: String,
  harvesting_time: String,
  expected_yield_per_acre_quintals: String,
  planting_material_quantity_per_acre: String,
  average_market_price_rupees_per_quintal: String,
  fertilizer_schedule: [fertilizerScheduleSchema],
  irrigation_schedule: [irrigationScheduleSchema],
  major_diseases: [diseaseSchema],
  major_pests: [pestSchema],
  estimated_cost_of_cultivation_per_acre: String,
  average_profit_margin_percentage: String
}, { timestamps: true, strict: false });

module.exports = mongoose.model("FruitCrop", fruitCropSchema);
