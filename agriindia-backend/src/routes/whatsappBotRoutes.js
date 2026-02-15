const express = require("express");
const fs = require("fs");
const path = require("path");
const Crop = require("../models/Crop");
const CashCrop = require("../models/CashCrop");
const FruitCrop = require("../models/FruitCrop");

const router = express.Router();

const sessions = new Map();
const LANGUAGE_MAP = { "1": "en", "2": "mr", "3": "hi" };
const MODULE_SCHEMES = {
  insurance: [
    {
      name: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
      type: "Crop Insurance",
      who_can_apply: "Loanee and non-loanee farmers",
      coverage: "Yield losses due to non-preventable risks",
      premium: "2% Kharif, 1.5% Rabi, 5% horticulture/commercial",
      where_to_apply: "Nearest CSC, participating bank branch, https://pmfby.gov.in",
    },
    {
      name: "Weather Based Crop Insurance Scheme (WBCIS)",
      type: "Weather Insurance",
      who_can_apply: "Farmers in notified areas",
      coverage: "Weather deviations affecting crop yield",
      premium: "As notified by state/season",
      where_to_apply: "Nearest CSC, authorized insurance partner, state agriculture office",
    },
    {
      name: "Coconut Palm Insurance Scheme (CPIS)",
      type: "Plantation Insurance",
      who_can_apply: "Coconut growers",
      coverage: "Loss of coconut palms due to natural causes",
      premium: "As per age slab and scheme rules",
      where_to_apply: "Coconut Development Board channels and partner insurers",
    },
  ],
  subsidies: [
    {
      name: "PM-KISAN",
      benefit: "Income support to eligible farmer families",
      eligibility: "Landholding farmer families as per scheme rules",
      where_to_apply: "https://pmkisan.gov.in, local agriculture office, CSC",
    },
    {
      name: "Soil Health Card Scheme",
      benefit: "Soil testing and nutrient recommendation",
      eligibility: "All farmers",
      where_to_apply: "District agriculture office / soil testing labs",
    },
    {
      name: "PMKSY (Micro Irrigation Subsidy)",
      benefit: "Subsidy for drip and sprinkler irrigation",
      eligibility: "Farmers adopting micro-irrigation",
      where_to_apply: "State horticulture/agriculture department portal and office",
    },
  ],
  loan: [
    {
      name: "Kisan Credit Card (KCC)",
      provider: "Banks and cooperative institutions",
      interest_rate: "As per bank/NABARD norms",
      max_amount: "Based on landholding and crop pattern",
      where_to_apply: "Nearest bank branch / online banking portal",
    },
    {
      name: "Agriculture Term Loan",
      provider: "Public and private sector banks",
      interest_rate: "Bank specific",
      max_amount: "Project and eligibility based",
      where_to_apply: "Nearest bank branch with project report",
    },
    {
      name: "NABARD Supported Farm Loans",
      provider: "Partner banks and regional rural banks",
      interest_rate: "Bank specific with subsidy support where applicable",
      max_amount: "Scheme and project based",
      where_to_apply: "Partner bank branches and district development offices",
    },
  ],
  msp: [
    {
      name: "MSP for Wheat",
      crop: "Wheat",
      rate: "Refer latest notified MSP",
      season_year: "Rabi Marketing Season",
      where_to_apply: "Procurement center / mandi / state procurement portal",
    },
    {
      name: "MSP for Paddy",
      crop: "Paddy",
      rate: "Refer latest notified MSP",
      season_year: "Kharif Marketing Season",
      where_to_apply: "Procurement center / mandi / state procurement portal",
    },
    {
      name: "MSP for Cotton",
      crop: "Cotton",
      rate: "Refer latest notified MSP",
      season_year: "Kharif Marketing Season",
      where_to_apply: "Cotton procurement center / mandi",
    },
  ],
};

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
    "????? AgriIndia Main Menu",
    "",
    "Please choose an option:",
    "",
    "1?? ?? Crop Information",
    "2?? ?? Insurance",
    "3?? ?? Subsidies",
    "4?? ?? Loan",
    "5?? ?? MSP",
    "7?? ?? Government Schemes",
    "0?? Exit",
    "",
    "Reply with one number.",
  ].join("\\n");
}

function cropMenuText() {
  return [
    "?? Crop Information",
    "",
    "Choose crop type:",
    "",
    "1?? ?? Rabi Crops",
    "2?? ??? Kharif Crops",
    "3?? ?? Cash Crops",
    "4?? ?? Fruit Crops",
    "5?? ?? Search by Crop Name",
    "0?? ?? Main Menu",
    "",
    "Reply with one number.",
  ].join("\\n");
}

function cropInfoTypeMenuText(name = "Crop") {
  return [
    `?? ${name}`,
    "",
    "Choose what you want next:",
    "1?? ?? Fertilizer",
    "2?? ?? Diseases",
    "0?? ?? Main Menu",
  ].join("\\n");
}

function moduleTitle(moduleKey = "") {
  const map = {
    insurance: "Insurance Schemes",
    subsidies: "Subsidy Schemes",
    loan: "Loan Schemes",
    msp: "MSP List",
  };
  return map[moduleKey] || "Schemes";
}

function moduleListText(moduleKey = "") {
  const schemes = MODULE_SCHEMES[moduleKey] || [];
  return [
    moduleTitle(moduleKey),
    "",
    "Reply with a number:",
    numberedList(schemes.map((s) => s.name)),
    "0?? ?? Main Menu",
  ].join("\\n");
}

function moduleDetailText(moduleKey = "", scheme = {}) {
  return [
    `? ${scheme.name || moduleTitle(moduleKey)}`,
    "",
    formatRecordAllFields(scheme),
    "",
    "0?? ?? Main Menu",
  ].join("\\n");
}

function languagePrompt() {
  return [
    "?? Welcome to AgriIndia Bot",
    "",
    "Please choose your language:",
    "1?? English",
    "2?? Marathi",
    "3?? Hindi",
    "",
    "Reply with one number.",
  ].join("\\n");
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
  const digits = ["0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];
  const pretty = (n) => String(n).split("").map((d) => digits[Number(d)] || d).join("");
  return items.map((item, index) => `${pretty(index + 1)} ${item}`).join("\n");
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
          reply = `?? Rabi Crops\n${numberedList(rabiRecords.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        } else {
          const crops = await Crop.find({ season: /rabi/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "rabi_crop_list";
          session.rabiCropOptions = names;
          reply = `?? Rabi Crops\n${numberedList(names.map((n) => n.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        }
      } else if (input === "2") {
        const kharifRecords = readDatasetRecords("kharifData.json")
          .map((row) => ({ name: normalizedRecordName(row), record: row }))
          .filter((row) => row.name);
        if (kharifRecords.length) {
          session.step = "kharif_crop_list";
          session.kharifCropOptions = kharifRecords;
          reply = `??? Kharif Crops\n${numberedList(kharifRecords.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        } else {
          const crops = await Crop.find({ season: /kharif/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "kharif_crop_list";
          session.kharifCropOptions = names;
          reply = `??? Kharif Crops\n${numberedList(names.map((n) => n.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        }
      } else if (input === "3") {
        const cashRecords = readDatasetRecords("cash crops.json");
        if (cashRecords.length) {
          session.step = "cash_crop_list";
          session.cashCropOptions = cashRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Cash Crops\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        } else {
          const crops = await CashCrop.find({}).lean();
          session.step = "cash_crop_list";
          session.cashCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Cash Crops\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        }
      } else if (input === "4") {
        const fruitRecords = readDatasetRecords("fruitcrops.json");
        if (fruitRecords.length) {
          session.step = "fruit_crop_list";
          session.fruitCropOptions = fruitRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Fruit Crops\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        } else {
          const crops = await FruitCrop.find({}).lean();
          session.step = "fruit_crop_list";
          session.fruitCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Fruit Crops\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\nReply with crop number for details.\n0?? ?? Main Menu`;
        }
      } else if (input === "5") {
        session.step = "awaiting_crop_name";
        reply = "?? Send crop name (example: Wheat, Mango, Cotton).";
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
          reply = `${selected.name}\n\nDetails not available.\n0?? ?? Main Menu`;
        }
      } else {
        reply = "Please reply with a valid rabi crop number.\n0?? ?? Main Menu";
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
          reply = `${selected.name}\n\nDetails not available.\n0?? ?? Main Menu`;
        }
      } else {
        reply = "Please reply with a valid kharif crop number.\n0?? ?? Main Menu";
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
        reply = "Please reply with a valid cash crop number.\n0?? ?? Main Menu";
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
        reply = "Please reply with a valid fruit crop number.\n0?? ?? Main Menu";
      }
    } else if (session.step === "crop_info_type_menu") {
      const selectedRecord = session.selectedCropRecord || null;
      const selectedName = session.selectedCropName || "Crop";
      if (!selectedRecord) {
        session.step = "main_menu";
        reply = menuText();
      } else if (input === "1") {
        reply = [
          `${selectedName} Fertilizer Guide`,
          "",
          buildFertilizerSection(selectedRecord),
          "",
          cropInfoTypeMenuText(selectedName),
        ].join("\n");
      } else if (input === "2") {
        reply = [
          `${selectedName} Disease Info`,
          "",
          buildDiseaseSection(selectedRecord),
          "",
          cropInfoTypeMenuText(selectedName),
        ].join("\n");
      } else {
        session.step = "main_menu";
        reply = menuText();
      }
    } else if (session.step === "module_list") {
      const schemes = MODULE_SCHEMES[session.activeModule] || [];
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const selected = schemes[selectedIndex] || null;
      if (selected) {
        session.step = "module_detail";
        session.selectedScheme = selected;
        reply = moduleDetailText(session.activeModule, selected);
      } else {
        reply = `Please reply with a valid number.\n\n${moduleListText(session.activeModule)}`;
      }
    } else if (session.step === "module_detail") {
      if (input === "0") {
        session.step = "main_menu";
        session.activeModule = null;
        session.selectedScheme = null;
        reply = menuText();
      } else {
        reply = moduleDetailText(session.activeModule, session.selectedScheme || {});
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
        reply = `Crop "${input}" not found.\n0?? ?? Main Menu`;
      }
    } else if (input === "1") {
      session.step = "crop_menu";
      reply = cropMenuText();
    } else if (input === "2") {
      session.step = "module_list";
      session.activeModule = "insurance";
      reply = moduleListText("insurance");
    } else if (input === "3") {
      session.step = "module_list";
      session.activeModule = "subsidies";
      reply = moduleListText("subsidies");
    } else if (input === "4") {
      session.step = "module_list";
      session.activeModule = "loan";
      reply = moduleListText("loan");
    } else if (input === "5") {
      session.step = "module_list";
      session.activeModule = "msp";
      reply = moduleListText("msp");
    } else if (input === "7") {
      reply = "?? Government schemes module will be available soon.\n\n0?? ?? Main Menu";
    } else if (input === "0") {
      sessions.delete(from);
      reply = "?? Thank you for using AgriIndia Bot.\nHave a good day, farmer! ??";
    } else {
      reply = menuText();
      session.step = "main_menu";
    }

    if (input !== "0") {
      sessions.set(from, session);
    }
    res.status(200).type("text/xml").send(twiml(reply));
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    // Always return TwiML so Twilio can send a fallback reply instead of silently failing.
    return res
      .status(200)
      .type("text/xml")
      .send(twiml("We are facing a temporary issue. Please send 0 to return to main menu."));
  }
});

module.exports = router;

