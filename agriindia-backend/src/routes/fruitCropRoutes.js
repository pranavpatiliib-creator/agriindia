const express = require("express");
const fs = require("fs");
const path = require("path");

const protect = require("../middleware/protect");
const authorize = require("../middleware/authorize");
const FruitCrop = require("../models/FruitCrop");

const router = express.Router();
const datasetPath = path.join(__dirname, "../../fruitcrops.json");

/* =========================================
   Utility Functions
========================================= */

function normalizeCrop(data) {
  const resolvedName = (data?.crop_name || data?.name || "").trim();

  const normalized = {
    ...data,
    crop_name: resolvedName,
  };

  return normalized;
}

function dedupeByName(items) {
  const unique = new Map();

  for (const item of items) {
    const name = (item?.crop_name || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, { ...item, crop_name: name });
    }
  }

  return Array.from(unique.values());
}

/* =========================================
   Sync Function (Admin Only)
========================================= */

async function syncFruitCropData() {
  if (!fs.existsSync(datasetPath)) {
    throw new Error("Dataset file not found");
  }

  const raw = fs.readFileSync(datasetPath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid dataset");
  }

  const operations = dedupeByName(parsed.map(normalizeCrop)).map((crop) => ({
    updateOne: {
      filter: { crop_name: crop.crop_name },
      update: { $set: crop },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await FruitCrop.bulkWrite(operations, { ordered: false });
  }
}

/* =========================================
   GET ALL FRUIT CROPS (Admin + Farmer)
========================================= */

router.get(
  "/",
  protect,
  authorize("admin", "farmer"),
  async (req, res) => {
    try {
      const data = await FruitCrop.find().lean();

      res.status(200).json({
        success: true,
        count: data.length,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

/* =========================================
   GET FRUIT CROP BY NAME
========================================= */

router.get(
  "/:name",
  protect,
  authorize("admin", "farmer"),
  async (req, res) => {
    try {
      const crop = await FruitCrop.findOne({
        crop_name: {
          $regex: `^${req.params.name}$`,
          $options: "i",
        },
      }).lean();

      if (!crop) {
        return res.status(404).json({
          success: false,
          message: "Fruit crop not found",
        });
      }

      res.status(200).json({
        success: true,
        data: crop,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

/* =========================================
   ADD FRUIT CROP (Admin Only)
========================================= */

router.post(
  "/",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const cropName = (req.body?.crop_name || req.body?.name || "").trim();

      if (!cropName) {
        return res.status(400).json({
          success: false,
          message: "crop_name is required",
        });
      }

      const created = await FruitCrop.create({
        ...req.body,
        crop_name: cropName,
      });

      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
);

/* =========================================
   DELETE FRUIT CROP (Admin Only)
========================================= */

router.delete(
  "/:name",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const deleted = await FruitCrop.findOneAndDelete({
        crop_name: {
          $regex: `^${req.params.name}$`,
          $options: "i",
        },
      });

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Fruit crop not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Fruit crop deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

/* =========================================
   UPDATE FRUIT CROP (Admin Only)
========================================= */

router.put(
  "/:name",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const updated = await FruitCrop.findOneAndUpdate(
        {
          crop_name: {
            $regex: `^${req.params.name}$`,
            $options: "i",
          },
        },
        req.body,
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Fruit crop not found",
        });
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }
);

/* =========================================
   SYNC FRUIT CROPS (Admin Only)
========================================= */

router.post(
  "/sync",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      await syncFruitCropData();

      res.status(200).json({
        success: true,
        message: "Fruit crop data synced successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

module.exports = router;
