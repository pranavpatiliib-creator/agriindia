const mongoose = require("mongoose");

/* Fertilizer Schedule */
const fertilizerSchema = new mongoose.Schema({
    stage: String,
    days_after_sowing: String,
    fertilizer_name: String,
    dosage_per_acre: String,
    application_method: String,
    water_quantity_for_spray: String
}, { _id: false, strict: false });

/* Disease Structure */
const diseaseSchema = new mongoose.Schema({
    disease_name: String,
    causal_organism: String,
    symptoms: String,
    preventive_measures: String,
    recommended_chemical: String,
    dosage_per_liter: String,
    waiting_period_before_harvest: String
}, { _id: false, strict: false });

/* Main Crop Schema */
const cropSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    season: String,
    sowing_time: String,
    harvesting_time: String,
    expected_yield_per_acre_quintals: String,
    seed_quantity_per_acre_kg: String,
    msp_rupees_per_quintal: String,
    soil_type: [String],

    fertilizer_schedule: [fertilizerSchema],
    major_diseases: [diseaseSchema]

}, { timestamps: true, strict: false });

module.exports = mongoose.model("Crop", cropSchema);

