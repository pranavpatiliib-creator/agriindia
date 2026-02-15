const express = require("express");
const fs = require("fs");
const path = require("path");

const Crop = require("../models/Crop");
const protect = require("../middleware/protect");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const datasetPaths = [
  path.join(__dirname, "../../kharifData.json"),
  path.join(__dirname, "../../rabiData.json"),
];

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

async function syncAllCropDataToDb() {
  for (const dataPath of datasetPaths) {
    if (!fs.existsSync(dataPath)) continue;

    const raw = fs.readFileSync(dataPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed) || parsed.length === 0) continue;

    const operations = dedupeByName(parsed.map(normalizeCropData)).map((crop) => ({
      updateOne: {
        filter: { name: crop.name.trim() },
        update: { $set: { ...crop, name: crop.name.trim() } },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await Crop.bulkWrite(operations, { ordered: false });
    }
  }
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.query.sync === "true") {
      await syncAllCropDataToDb();
    }

    const crops = await Crop.find();
    res.status(200).json(crops);
  })
);

router.get(
  "/:name",
  asyncHandler(async (req, res) => {
    const safeName = escapeRegex(req.params.name);
    const crop = await Crop.findOne({
      name: { $regex: `^${safeName}$`, $options: "i" },
    });

    if (!crop) {
      res.status(404);
      throw new Error("Crop not found");
    }

    res.status(200).json(crop);
  })
);

router.post(
  "/",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const newCrop = new Crop(req.body);
    await newCrop.save();
    res.status(201).json(newCrop);
  })
);

router.put(
  "/:name",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const safeName = escapeRegex(req.params.name);
    const updatedCrop = await Crop.findOneAndUpdate(
      { name: { $regex: `^${safeName}$`, $options: "i" } },
      req.body,
      { new: true }
    );

    if (!updatedCrop) {
      res.status(404);
      throw new Error("Crop not found");
    }

    res.status(200).json(updatedCrop);
  })
);

router.delete(
  "/:name",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const safeName = escapeRegex(req.params.name);
    const deletedCrop = await Crop.findOneAndDelete({
      name: { $regex: `^${safeName}$`, $options: "i" },
    });

    if (!deletedCrop) {
      res.status(404);
      throw new Error("Crop not found");
    }

    res.status(200).json({ message: "Crop deleted successfully" });
  })
);

module.exports = router;
