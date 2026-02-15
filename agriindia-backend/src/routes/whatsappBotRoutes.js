const express = require("express");
const fs = require("fs");
const path = require("path");
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

function splitMessage(text = "", maxLen = 1400) {
  const lines = String(text).split("\n");
  const chunks = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length <= maxLen) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (line.length <= maxLen) {
      current = line;
      continue;
    }

    let start = 0;
    while (start < line.length) {
      chunks.push(line.slice(start, start + maxLen));
      start += maxLen;
    }
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [""];
}

function twiml(message) {
  const parts = splitMessage(message);
  const payload = parts.map((part) => `<Message>${escapeXml(part)}</Message>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${payload}</Response>`;
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

function cropInfoTypeMenuText(name = "Crop") {
  return [
    `${name} - Information Menu`,
    "",
    "Reply with a number:",
    "1. Fertilizer",
    "2. Diseases",
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

function numberedList(items = []) {
  if (!items.length) return "No records found.";
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function numberedListFromItems(items = [], field = "name") {
  const names = items
    .map((item) => String(item?.[field] || "").trim())
    .filter(Boolean);
  return numberedList(names);
}

function readCropNamesFromDataset(fileName) {
  try {
    const filePath = path.join(__dirname, "../../", fileName);
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(parsed)) return [];

    const unique = new Map();
    for (const row of parsed) {
      const name = String(row?.name || "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!unique.has(key)) unique.set(key, name);
    }

    return [...unique.values()];
  } catch (_) {
    return [];
  }
}

function readDatasetRecords(fileName) {
  try {
    const filePath = path.join(__dirname, "../../", fileName);
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizedRecordName(row = {}) {
  return String(row?.name || row?.crop_name || "").trim();
}

function toTitle(key = "") {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAny(value, indent = "") {
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}- N/A`;
    return value
      .map((item, index) => {
        if (item && typeof item === "object") {
          return `${indent}- Item ${index + 1}\n${formatRecordAllFields(item, `${indent}  `)}`;
        }
        return `${indent}- ${String(item)}`;
      })
      .join("\n");
  }

  if (value && typeof value === "object") {
    return formatRecordAllFields(value, `${indent}`);
  }

  if (value === null || value === undefined || value === "") return `${indent}N/A`;
  return `${indent}${String(value)}`;
}

function formatRecordAllFields(record, indent = "") {
  return Object.entries(record || {})
    .map(([key, value]) => {
      if (Array.isArray(value) || (value && typeof value === "object")) {
        return `${indent}${toTitle(key)}:\n${formatAny(value, `${indent}  `)}`;
      }
      return `${indent}${toTitle(key)}: ${formatAny(value)}`;
    })
    .join("\n");
}

function pickFirstExisting(record = {}, keys = []) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildFertilizerSection(record = {}) {
  const schedule = normalizeArray(
    pickFirstExisting(record, ["fertilizer_schedule", "fertilizerSchedule"])
  );
  if (!schedule.length) return "Fertilizer Dosage: N/A";

  const lines = ["Fertilizer Dosage:"];
  for (let i = 0; i < Math.min(schedule.length, 5); i += 1) {
    const row = schedule[i] || {};
    const stage = row.stage || row.application_period || `Step ${i + 1}`;
    const dosage = row.dosage_per_acre || row.dosage || row.quantity || "N/A";
    lines.push(`${i + 1}. ${stage}: ${dosage}`);
  }
  return lines.join("\n");
}

function buildDiseaseSection(record = {}) {
  const diseases = normalizeArray(
    pickFirstExisting(record, ["major_diseases", "diseases", "disease_management"])
  );
  if (!diseases.length) return "Diseases: N/A";

  const lines = ["Diseases:"];
  for (let i = 0; i < Math.min(diseases.length, 5); i += 1) {
    const row = diseases[i] || {};
    const diseaseName = row.disease_name || row.name || row.disease || `Disease ${i + 1}`;
    lines.push(`${i + 1}. ${diseaseName}`);
  }
  return lines.join("\n");
}

function formatCropResponse(record = {}, heading = "Crop") {
  const rawYield =
    record.expected_yield_per_acre_quintals ||
    record.expected_yield ||
    record.yield ||
    "N/A";
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : "N/A";

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    "N/A";
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : "N/A";

  return [
    heading,
    "",
    `Season: ${record.season || "N/A"}`,
    `Sowing/Planting: ${record.sowing_time || record.sowing_or_planting_time || "N/A"}`,
    `Harvesting: ${record.harvesting_time || "N/A"}`,
    `Yield: ${yieldText}`,
    `MSP: ${mspText}`,
    buildFertilizerSection(record),
    buildDiseaseSection(record),
    "",
    "Full Details:",
    formatRecordAllFields(record),
  ].join("\n");
}

function buildBasicInfoSection(record = {}) {
  const rawYield =
    record.expected_yield_per_acre_quintals ||
    record.expected_yield ||
    record.yield ||
    "N/A";
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : "N/A";

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    "N/A";
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : "N/A";

  return [
    `Season: ${record.season || "N/A"}`,
    `Sowing/Planting: ${record.sowing_time || record.sowing_or_planting_time || "N/A"}`,
    `Harvesting: ${record.harvesting_time || "N/A"}`,
    `Yield: ${yieldText}`,
    `MSP: ${mspText}`,
  ].join("\n");
}

function buildCropInfoLanding(record = {}, heading = "Crop") {
  return [
    heading,
    "",
    buildBasicInfoSection(record),
    "",
    cropInfoTypeMenuText(heading),
  ].join("\n");
}

async function findCropRecordByName(name) {
  const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const normalizedName = String(name || "").trim().toLowerCase();

  const datasets = [
    ...readDatasetRecords("rabiData.json"),
    ...readDatasetRecords("kharifData.json"),
    ...readDatasetRecords("cash crops.json"),
    ...readDatasetRecords("fruitcrops.json"),
  ];

  const datasetMatch = datasets.find((row) => {
    const rowName = String(row?.name || row?.crop_name || "").trim().toLowerCase();
    return rowName && rowName === normalizedName;
  });

  if (datasetMatch) {
    const heading = datasetMatch.crop_name || datasetMatch.name || "Crop";
    return { heading, record: datasetMatch };
  }

  const [crop, cashCrop, fruitCrop] = await Promise.all([
    Crop.findOne({ name: regex }).lean(),
    CashCrop.findOne({ crop_name: regex }).lean(),
    FruitCrop.findOne({ crop_name: regex }).lean(),
  ]);

  if (crop) {
    return { heading: crop.name || "Crop", record: crop };
  }

  const special = cashCrop || fruitCrop;
  if (special) {
    return { heading: special.crop_name || special.name || "Crop", record: special };
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
        const rabiRecords = readDatasetRecords("rabiData.json")
          .map((row) => ({ name: normalizedRecordName(row), record: row }))
          .filter((row) => row.name);
        if (rabiRecords.length) {
          session.step = "rabi_crop_list";
          session.rabiCropOptions = rabiRecords;
          reply = `Rabi crops:\n${numberedList(rabiRecords.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        } else {
          const crops = await Crop.find({ season: /rabi/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "rabi_crop_list";
          session.rabiCropOptions = names;
          reply = `Rabi crops:\n${numberedList(names.map((n) => n.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        }
      } else if (input === "2") {
        const kharifRecords = readDatasetRecords("kharifData.json")
          .map((row) => ({ name: normalizedRecordName(row), record: row }))
          .filter((row) => row.name);
        if (kharifRecords.length) {
          session.step = "kharif_crop_list";
          session.kharifCropOptions = kharifRecords;
          reply = `Kharif crops:\n${numberedList(kharifRecords.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        } else {
          const crops = await Crop.find({ season: /kharif/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "kharif_crop_list";
          session.kharifCropOptions = names;
          reply = `Kharif crops:\n${numberedList(names.map((n) => n.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        }
      } else if (input === "3") {
        const cashRecords = readDatasetRecords("cash crops.json");
        if (cashRecords.length) {
          session.step = "cash_crop_list";
          session.cashCropOptions = cashRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `Cash crops:\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        } else {
          const crops = await CashCrop.find({}).lean();
          session.step = "cash_crop_list";
          session.cashCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `Cash crops:\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        }
      } else if (input === "4") {
        const fruitRecords = readDatasetRecords("fruitcrops.json");
        if (fruitRecords.length) {
          session.step = "fruit_crop_list";
          session.fruitCropOptions = fruitRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `Fruit crops:\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        } else {
          const crops = await FruitCrop.find({}).lean();
          session.step = "fruit_crop_list";
          session.fruitCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `Fruit crops:\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\nReply 0 for main menu.`;
        }
      } else if (input === "5") {
        session.step = "awaiting_crop_name";
        reply = "Send crop name (example: Wheat, Mango, Cotton).";
      } else {
        session.step = "main_menu";
        reply = menuText();
      }
    } else if (session.step === "rabi_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const options = Array.isArray(session.rabiCropOptions) ? session.rabiCropOptions : [];
      const selected = options[selectedIndex];
      if (selected) {
        const record = selected.record || null;
        if (record) {
          session.step = "crop_info_type_menu";
          session.selectedCropName = selected.name;
          session.selectedCropRecord = record;
          reply = buildCropInfoLanding(record, selected.name);
        } else {
          reply = `${selected.name}\n\nDetails not available.\nReply 0 for main menu.`;
        }
      } else {
        reply = "Please reply with a valid rabi crop number.\nReply 0 for main menu.";
      }
    } else if (session.step === "kharif_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const options = Array.isArray(session.kharifCropOptions) ? session.kharifCropOptions : [];
      const selected = options[selectedIndex];
      if (selected) {
        const record = selected.record || null;
        if (record) {
          session.step = "crop_info_type_menu";
          session.selectedCropName = selected.name;
          session.selectedCropRecord = record;
          reply = buildCropInfoLanding(record, selected.name);
        } else {
          reply = `${selected.name}\n\nDetails not available.\nReply 0 for main menu.`;
        }
      } else {
        reply = "Please reply with a valid kharif crop number.\nReply 0 for main menu.";
      }
    } else if (session.step === "cash_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.cashCropOptions) ? session.cashCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || "Cash Crop";
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = selected;
        reply = buildCropInfoLanding(selected, cropName);
      } else {
        reply = "Please reply with a valid cash crop number.\nReply 0 for main menu.";
      }
    } else if (session.step === "fruit_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.fruitCropOptions) ? session.fruitCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || "Fruit Crop";
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = selected;
        reply = buildCropInfoLanding(selected, cropName);
      } else {
        reply = "Please reply with a valid fruit crop number.\nReply 0 for main menu.";
      }
    } else if (session.step === "crop_info_type_menu") {
      const selectedRecord = session.selectedCropRecord || null;
      const selectedName = session.selectedCropName || "Crop";
      if (!selectedRecord) {
        session.step = "main_menu";
        reply = menuText();
      } else if (input === "1") {
        reply = [
          `${selectedName} - Fertilizer`,
          "",
          buildFertilizerSection(selectedRecord),
          "",
          cropInfoTypeMenuText(selectedName),
        ].join("\n");
      } else if (input === "2") {
        reply = [
          `${selectedName} - Diseases`,
          "",
          buildDiseaseSection(selectedRecord),
          "",
          cropInfoTypeMenuText(selectedName),
        ].join("\n");
      } else {
        session.step = "main_menu";
        reply = menuText();
      }
    } else if (session.step === "awaiting_crop_name") {
      const matched = await findCropRecordByName(input);
      if (matched?.record) {
        session.step = "crop_info_type_menu";
        session.selectedCropName = matched.heading;
        session.selectedCropRecord = matched.record;
        reply = buildCropInfoLanding(matched.record, matched.heading);
      } else {
        session.step = "main_menu";
        reply = `Crop "${input}" not found.\nReply 0 for main menu.`;
      }
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
