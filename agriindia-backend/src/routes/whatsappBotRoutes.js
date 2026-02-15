const express = require("express");
const Crop = require("../models/Crop");
const CashCrop = require("../models/CashCrop");
const FruitCrop = require("../models/FruitCrop");

const router = express.Router();

const sessions = new Map();

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(
    message
  )}</Message></Response>`;
}

function menuText() {
  return [
    "AgriIndia WhatsApp Bot",
    "",
    "Reply with a number:",
    "1. Rabi crops",
    "2. Kharif crops",
    "3. Cash crops",
    "4. Fruit crops",
    "5. Crop details by name",
    "0. Show menu",
  ].join("\n");
}

function shortList(items, field = "name", limit = 15) {
  const names = items
    .map((item) => item?.[field])
    .filter(Boolean)
    .slice(0, limit);
  if (names.length === 0) return "No records found.";
  return names.join(", ");
}

async function getCropDetailsByName(name) {
  const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

  const [crop, cashCrop, fruitCrop] = await Promise.all([
    Crop.findOne({ name: regex }).lean(),
    CashCrop.findOne({ crop_name: regex }).lean(),
    FruitCrop.findOne({ crop_name: regex }).lean(),
  ]);

  if (crop) {
    return [
      `Crop: ${crop.name}`,
      `Season: ${crop.season || "N/A"}`,
      `Sowing: ${crop.sowing_time || "N/A"}`,
      `Harvesting: ${crop.harvesting_time || "N/A"}`,
      `Yield: ${crop.expected_yield_per_acre_quintals || "N/A"}`,
    ].join("\n");
  }

  const special = cashCrop || fruitCrop;
  if (special) {
    return [
      `Crop: ${special.crop_name}`,
      `Type: ${special.crop_type || "N/A"}`,
      `Season: ${special.season || "N/A"}`,
      `Planting: ${special.sowing_or_planting_time || "N/A"}`,
      `Harvesting: ${special.harvesting_time || "N/A"}`,
      `Yield: ${special.expected_yield_per_acre_quintals || "N/A"}`,
    ].join("\n");
  }

  return null;
}

router.post("/webhook", async (req, res, next) => {
  try {
    const from = (req.body?.From || "unknown").trim();
    const input = (req.body?.Body || "").trim();
    const lowerInput = input.toLowerCase();
    const session = sessions.get(from) || { step: "menu" };

    let reply = "";

    if (!input || ["hi", "hello", "menu", "start", "help"].includes(lowerInput)) {
      session.step = "menu";
      reply = menuText();
    } else if (session.step === "awaiting_crop_name") {
      const details = await getCropDetailsByName(input);
      session.step = "menu";
      reply = details
        ? `${details}\n\nReply 0 for main menu.`
        : `Crop "${input}" not found.\nReply 0 for main menu.`;
    } else if (input === "1") {
      const crops = await Crop.find({ season: /rabi/i }, { name: 1, _id: 0 }).lean();
      reply = `Rabi crops:\n${shortList(crops)}\n\nReply 0 for menu.`;
    } else if (input === "2") {
      const crops = await Crop.find({ season: /kharif/i }, { name: 1, _id: 0 }).lean();
      reply = `Kharif crops:\n${shortList(crops)}\n\nReply 0 for menu.`;
    } else if (input === "3") {
      const crops = await CashCrop.find({}, { crop_name: 1, _id: 0 }).lean();
      reply = `Cash crops:\n${shortList(crops, "crop_name")}\n\nReply 0 for menu.`;
    } else if (input === "4") {
      const crops = await FruitCrop.find({}, { crop_name: 1, _id: 0 }).lean();
      reply = `Fruit crops:\n${shortList(crops, "crop_name")}\n\nReply 0 for menu.`;
    } else if (input === "5") {
      session.step = "awaiting_crop_name";
      reply = "Send crop name (example: Wheat, Mango, Cotton).";
    } else if (input === "0") {
      session.step = "menu";
      reply = menuText();
    } else {
      reply = `Invalid input.\n\n${menuText()}`;
      session.step = "menu";
    }

    sessions.set(from, session);
    res.status(200).type("text/xml").send(twiml(reply));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
