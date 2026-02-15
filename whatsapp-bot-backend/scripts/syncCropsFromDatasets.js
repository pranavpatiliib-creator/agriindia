require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Crop = require("../src/models/Crop");

const root = path.join(__dirname, "..");

function existingPath(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const datasetFiles = {
  kharif: existingPath([
    path.join(root, "kharifData.json"),
    path.join(root, "..", "agriindia-backend", "kharifData.json"),
  ]),
  rabi: existingPath([
    path.join(root, "rabiData.json"),
    path.join(root, "..", "agriindia-backend", "rabiData.json"),
  ]),
  cash: existingPath([
    path.join(root, "cash crops.json"),
    path.join(root, "cashCrops.json"),
    path.join(root, "..", "agriindia-backend", "cash crops.json"),
  ]),
  fruit: existingPath([
    path.join(root, "fruitcrops.json"),
    path.join(root, "jsonfruitcrop.json"),
    path.join(root, "..", "agriindia-backend", "fruitcrops.json"),
  ]),
};

function readArray(filePath) {
  if (!filePath) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeSeason(value, fallback) {
  const season = String(value || "").trim().toLowerCase();
  if (season === "kharif") return "Kharif";
  if (season === "rabi") return "Rabi";
  if (season === "zaid") return "Zaid";
  return fallback;
}

function normalizeCrop(row, category, defaultSeason) {
  const name = String(row?.name || row?.crop_name || "").trim();
  if (!name) return null;

  return {
    name,
    category,
    season: normalizeSeason(row?.season, defaultSeason),
    soilType: String(row?.soilType || row?.soil_type || "").trim(),
    waterRequirement: String(row?.waterRequirement || row?.water_requirement || "").trim(),
    durationDays: Number.parseInt(row?.durationDays || row?.duration_days || 0, 10) || 0,
  };
}

function dedupeByName(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row?.name) continue;
    const key = row.name.toLowerCase();
    if (!map.has(key)) map.set(key, row);
  }
  return [...map.values()];
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const normalized = [
    ...readArray(datasetFiles.kharif).map((x) => normalizeCrop(x, "Kharif", "Kharif")),
    ...readArray(datasetFiles.rabi).map((x) => normalizeCrop(x, "Rabi", "Rabi")),
    ...readArray(datasetFiles.cash).map((x) => normalizeCrop(x, "Cash", "Kharif")),
    ...readArray(datasetFiles.fruit).map((x) => normalizeCrop(x, "Fruit", "Zaid")),
  ].filter(Boolean);

  const unique = dedupeByName(normalized);

  if (unique.length === 0) {
    console.log("No records found. Checked files:");
    console.log(datasetFiles);
    process.exit(0);
  }

  const operations = unique.map((crop) => ({
    updateOne: {
      filter: { name: crop.name },
      update: { $set: crop },
      upsert: true,
    },
  }));

  await Crop.bulkWrite(operations, { ordered: false });

  console.log(`Synced ${unique.length} crops.`);
  console.log(datasetFiles);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  process.exit(1);
});
