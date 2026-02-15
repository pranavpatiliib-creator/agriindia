require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Crop = require("./src/models/Crop");
const CashCrop = require("./src/models/CashCrop");
const FruitCrop = require("./src/models/FruitCrop");

const datasetPaths = [
  path.join(__dirname, "kharifData.json"),
  path.join(__dirname, "rabiData.json")
];
const cashCropPath = path.join(__dirname, "cash crops.json");
const fruitCropPath = path.join(__dirname, "fruitcrops.json");

function normalizeCropData(crop) {
  const normalized = { ...crop };

  if (!normalized.sowing_time && normalized["crop.sowing_time"]) {
    normalized.sowing_time = normalized["crop.sowing_time"];
  }

  delete normalized["crop.sowing_time"];
  return normalized;
}

function dedupeByName(crops) {
  const unique = new Map();
  for (const crop of crops) {
    const name = (crop?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, { ...crop, name });
    }
  }
  return Array.from(unique.values());
}

function dedupeByCropName(crops) {
  const unique = new Map();
  for (const crop of crops) {
    const name = (crop?.crop_name || crop?.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, { ...crop, crop_name: name, name });
    }
  }
  return Array.from(unique.values());
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const uploadData = async () => {
  try {
    const allData = [];
    for (const dataPath of datasetPaths) {
      if (!fs.existsSync(dataPath)) continue;
      const parsed = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
      if (Array.isArray(parsed)) {
        allData.push(...parsed);
      }
    }

    const operations = dedupeByName(allData.map(normalizeCropData))
      .map((crop) => ({
        updateOne: {
          filter: { name: crop.name.trim() },
          update: { $set: { ...crop, name: crop.name.trim() } },
          upsert: true
        }
      }));

    if (operations.length === 0) {
      console.log("No valid crop records found in kharifData.json/rabiData.json");
      process.exit(0);
    }

    await Crop.bulkWrite(operations, { ordered: false });

    const cashData = fs.existsSync(cashCropPath)
      ? JSON.parse(fs.readFileSync(cashCropPath, "utf-8"))
      : [];
    const fruitData = fs.existsSync(fruitCropPath)
      ? JSON.parse(fs.readFileSync(fruitCropPath, "utf-8"))
      : [];

    const cashOps = dedupeByCropName(Array.isArray(cashData) ? cashData : []).map((crop) => ({
      updateOne: {
        filter: { crop_name: crop.crop_name.trim() },
        update: { $set: { ...crop, crop_name: crop.crop_name.trim() } },
        upsert: true
      }
    }));

    const fruitOps = dedupeByCropName(Array.isArray(fruitData) ? fruitData : []).map((crop) => ({
      updateOne: {
        filter: { crop_name: crop.crop_name.trim() },
        update: { $set: { ...crop, crop_name: crop.crop_name.trim() } },
        upsert: true
      }
    }));

    if (cashOps.length > 0) {
      await CashCrop.bulkWrite(cashOps, { ordered: false });
    }

    if (fruitOps.length > 0) {
      await FruitCrop.bulkWrite(fruitOps, { ordered: false });
    }

    console.log(`Dataset synced: ${operations.length} crops, ${cashOps.length} cash crops, ${fruitOps.length} fruit crops`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

uploadData();
