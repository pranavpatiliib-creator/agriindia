const express = require("express");
const Crop = require("../models/Crop");
const CashCrop = require("../models/CashCrop");
const FruitCrop = require("../models/FruitCrop");

const router = express.Router();

const sessions = new Map();
const LANGUAGE_MAP = { "1": "en", "2": "mr", "3": "hi" };

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
    "AgriIndia WhatsApp Bot (v2)",
    "",
    "Reply with a number:",
    "1. Crop Information",
    "2. Insurance",
    "3. Subsidies",
    "4. Loan",
    "5. MSP",
    "7. Government Schemes",
    "0. Exit",
  ].join("\n");
}

function cropMenuText() {
  return [
    "Crop Information",
    "",
    "Reply with a number:",
    "1. Rabi crops",
    "2. Kharif crops",
    "3. Cash crops",
    "4. Fruit crops",
    "5. Crop details by name",
    "0. Main menu",
  ].join("\n");
}

function languagePrompt() {
  return [
    "Welcome to AgriIndia WhatsApp Bot",
    "",
    "Please select language / भाषा निवडा / भाषा चुनें:",
    "1. English",
    "2. Marathi",
    "3. Hindi",
  ].join("\n");
}

function welcomeByLanguage(language) {
  if (language === "mr") return "AgriIndia मध्ये आपले स्वागत आहे.";
  if (language === "hi") return "AgriIndia में आपका स्वागत है।";
  return "Welcome to AgriIndia.";
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
    const session = sessions.get(from) || { step: "main_menu" };

    let reply = "";

    if (!session.language) {
      const selectedLanguage = LANGUAGE_MAP[input];
      if (!selectedLanguage) {
        reply = languagePrompt();
      } else {
        session.language = selectedLanguage;
        session.step = "main_menu";
        reply = `${welcomeByLanguage(selectedLanguage)}\n\n${menuText()}`;
      }
    } else if (!input || ["hi", "hello", "menu", "start", "help"].includes(lowerInput)) {
      session.step = "main_menu";
      reply = menuText();
    } else if (session.step === "crop_menu") {
      if (input === "1") {
        const crops = await Crop.find({ season: /rabi/i }, { name: 1, _id: 0 }).lean();
        reply = `Rabi crops:\n${shortList(crops)}\n\nReply 0 for main menu.`;
      } else if (input === "2") {
        const crops = await Crop.find({ season: /kharif/i }, { name: 1, _id: 0 }).lean();
        reply = `Kharif crops:\n${shortList(crops)}\n\nReply 0 for main menu.`;
      } else if (input === "3") {
        const crops = await CashCrop.find({}, { crop_name: 1, _id: 0 }).lean();
        reply = `Cash crops:\n${shortList(crops, "crop_name")}\n\nReply 0 for main menu.`;
      } else if (input === "4") {
        const crops = await FruitCrop.find({}, { crop_name: 1, _id: 0 }).lean();
        reply = `Fruit crops:\n${shortList(crops, "crop_name")}\n\nReply 0 for main menu.`;
      } else if (input === "5") {
        session.step = "awaiting_crop_name";
        reply = "Send crop name (example: Wheat, Mango, Cotton).";
      } else {
        session.step = "main_menu";
        reply = menuText();
      }
    } else if (session.step === "awaiting_crop_name") {
      const details = await getCropDetailsByName(input);
      session.step = "main_menu";
      reply = details
        ? `${details}\n\nReply 0 for main menu.`
        : `Crop "${input}" not found.\nReply 0 for main menu.`;
    } else if (input === "1") {
      session.step = "crop_menu";
      reply = cropMenuText();
    } else if (input === "2") {
      reply = "Insurance module will be available soon.\n\nReply 0 for main menu.";
    } else if (input === "3") {
      reply = "Subsidies module will be available soon.\n\nReply 0 for main menu.";
    } else if (input === "4") {
      reply = "Loan module will be available soon.\n\nReply 0 for main menu.";
    } else if (input === "5") {
      reply = "MSP module will be available soon.\n\nReply 0 for main menu.";
    } else if (input === "7") {
      reply = "Government schemes module will be available soon.\n\nReply 0 for main menu.";
    } else if (input === "0") {
      sessions.delete(from);
      reply = "Thank you for using AgriIndia WhatsApp Bot.";
    } else {
      reply = menuText();
      session.step = "main_menu";
    }

    if (input !== "0") {
      sessions.set(from, session);
    }
    res.status(200).type("text/xml").send(twiml(reply));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
