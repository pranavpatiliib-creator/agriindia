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
      type: "पीक विमा",
      who_can_apply: "कर्जदार व बिगर-कर्जदार शेतकरी",
      coverage: "नैसर्गिक जोखमीमुळे होणारे उत्पादन नुकसान",
      premium: "खरीप 2%, रब्बी 1.5%, बागायती/व्यावसायिक 5%",
      where_to_apply: "जवळचे CSC, सहभागी बँक शाखा, https://pmfby.gov.in",
    },
    {
      name: "Weather Based Crop Insurance Scheme (WBCIS)",
      type: "हवामान आधारित विमा",
      who_can_apply: "सूचित क्षेत्रातील शेतकरी",
      coverage: "हवामानातील बदलामुळे होणारे नुकसान",
      premium: "राज्य/हंगामनुसार",
      where_to_apply: "जवळचे CSC, अधिकृत विमा भागीदार, राज्य कृषी कार्यालय",
    },
    {
      name: "Coconut Palm Insurance Scheme (CPIS)",
      type: "बागायती विमा",
      who_can_apply: "नारळ उत्पादक शेतकरी",
      coverage: "नैसर्गिक कारणांमुळे नारळ झाडांचे नुकसान",
      premium: "वय गट व योजनेच्या नियमांनुसार",
      where_to_apply: "Coconut Development Board व भागीदार विमा कंपनीमार्फत",
    },
  ],
  subsidies: [
    {
      name: "PM-KISAN",
      benefit: "पात्र शेतकरी कुटुंबांना आर्थिक मदत",
      eligibility: "योजनेनुसार पात्र जमीनधारक शेतकरी कुटुंबे",
      where_to_apply: "https://pmkisan.gov.in, स्थानिक कृषी कार्यालय, CSC",
    },
    {
      name: "Soil Health Card Scheme",
      benefit: "माती तपासणी व पोषणद्रव्य शिफारस",
      eligibility: "सर्व शेतकरी",
      where_to_apply: "जिल्हा कृषी कार्यालय / मृदा परीक्षण प्रयोगशाळा",
    },
    {
      name: "PMKSY (Micro Irrigation Subsidy)",
      benefit: "ड्रिप व स्प्रिंकलर सिंचनासाठी अनुदान",
      eligibility: "सूक्ष्म सिंचन स्वीकारणारे शेतकरी",
      where_to_apply: "राज्य कृषी/फलोत्पादन विभाग पोर्टल व कार्यालय",
    },
  ],
  loan: [
    {
      name: "Kisan Credit Card (KCC)",
      provider: "बँका व सहकारी संस्था",
      interest_rate: "बँक/NABARD नियमांनुसार",
      max_amount: "जमीन व पीक पॅटर्ननुसार",
      where_to_apply: "जवळची बँक शाखा / ऑनलाइन बँकिंग पोर्टल",
    },
    {
      name: "Agriculture Term Loan",
      provider: "सार्वजनिक व खाजगी क्षेत्रातील बँका",
      interest_rate: "बँकेनुसार",
      max_amount: "प्रकल्प व पात्रतेनुसार",
      where_to_apply: "प्रकल्प अहवालासह जवळची बँक शाखा",
    },
    {
      name: "NABARD Supported Farm Loans",
      provider: "भागीदार बँका व प्रादेशिक ग्रामीण बँका",
      interest_rate: "लागू असल्यास अनुदानासह, बँकेनुसार",
      max_amount: "योजना व प्रकल्पानुसार",
      where_to_apply: "भागीदार बँक शाखा व जिल्हा विकास कार्यालय",
    },
  ],
  msp: [
    {
      name: "MSP for Wheat",
      crop: "Wheat",
      rate: "नवीनतम जाहीर MSP पहा",
      season_year: "रब्बी खरेदी हंगाम",
      where_to_apply: "खरेदी केंद्र / बाजार समिती / राज्य खरेदी पोर्टल",
    },
    {
      name: "MSP for Paddy",
      crop: "Paddy",
      rate: "नवीनतम जाहीर MSP पहा",
      season_year: "खरीप खरेदी हंगाम",
      where_to_apply: "खरेदी केंद्र / बाजार समिती / राज्य खरेदी पोर्टल",
    },
    {
      name: "MSP for Cotton",
      crop: "Cotton",
      rate: "नवीनतम जाहीर MSP पहा",
      season_year: "खरीप खरेदी हंगाम",
      where_to_apply: "कापूस खरेदी केंद्र / बाजार समिती",
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
    "????? AgriIndia ????? ????",
    "",
    "????? ?????? ?????:",
    "",
    "1?? ?? ??? ??????",
    "2?? ?? ????",
    "3?? ?? ??????",
    "4?? ?? ????",
    "5?? ?? MSP",
    "7?? ?? ?????? ?????",
    "0?? ????? ???",
    "",
    "?? ??????? ?????.",
  ].join("\\n");
}

function cropMenuText() {
  return [
    "?? ??? ??????",
    "",
    "??? ?????? ?????:",
    "",
    "1?? ?? ????? ????",
    "2?? ??? ???? ????",
    "3?? ?? ???? ????",
    "4?? ?? ?? ????",
    "5?? ?? ?????? ??? ????",
    "0?? ?? ????? ????",
    "",
    "?? ??????? ?????.",
  ].join("\\n");
}

function cropInfoTypeMenuText(name = "Crop") {
  return [
    `?? ${name}`,
    "",
    "????? ?????? ?????:",
    "1?? ?? ?? ??????",
    "2?? ?? ??? ??????",
    "0?? ?? ????? ????",
  ].join("\\n");
}

function moduleTitle(moduleKey = "") {
  const map = {
    insurance: "?? ???? ?????",
    subsidies: "?? ?????? ?????",
    loan: "?? ???? ?????",
    msp: "?? MSP ????",
  };
  return map[moduleKey] || "?????";
}

function moduleListText(moduleKey = "") {
  const schemes = MODULE_SCHEMES[moduleKey] || [];
  return [
    moduleTitle(moduleKey),
    "",
    "?? ??????? ?????:",
    numberedList(schemes.map((s) => s.name)),
    "0?? ?? ????? ????",
  ].join("\\n");
}

function moduleDetailText(moduleKey = "", scheme = {}) {
  return [
    `? ${scheme.name || moduleTitle(moduleKey)}`,
    "",
    formatRecordAllFields(scheme),
    "",
    "0?? ?? ????? ????",
  ].join("\\n");
}

function languagePrompt() {
  return [
    "?? AgriIndia ???????? ???? ?????? ???",
    "",
    "????? ???? ?????:",
    "1?? English",
    "2?? ?????",
    "3?? ?????",
    "",
    "?? ??????? ?????.",
  ].join("\\n");
}

function welcomeByLanguage(language) {
  if (language === "mr") return "AgriIndia मध्ये आपले स्वागत आहे.";
  if (language === "hi") return "AgriIndia में आपका स्वागत है।";
  return "AgriIndia ????? ???? ?????? ???.";
}

function shortList(items, field = "name", limit = 15) {
  const names = items
    .map((item) => item?.[field])
    .filter(Boolean)
    .slice(0, limit);
  if (names.length === 0) return "??????? ?????? ?????.";
  return names.join(", ");
}

function numberedList(items = []) {
  if (!items.length) return "??????? ?????? ?????.";
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
  const map = {
    name: "नाव",
    type: "प्रकार",
    who_can_apply: "कोण अर्ज करू शकतो",
    coverage: "कव्हरेज",
    premium: "प्रीमियम",
    where_to_apply: "अर्ज कुठे करावा",
    benefit: "फायदा",
    eligibility: "पात्रता",
    provider: "प्रदाता",
    interest_rate: "व्याजदर",
    max_amount: "जास्तीत जास्त रक्कम",
    crop: "पीक",
    rate: "दर",
    season_year: "हंगाम/वर्ष",
  };
  if (map[key]) return map[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAny(value, indent = "") {
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}- ?????? ????`;
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

  if (value === null || value === undefined || value === "") return `${indent}?????? ????`;
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

function translateTextToMarathi(text = "") {
  let out = String(text);
  const replacements = [
    [/No MSP \(market-based pricing\)/gi, "MSP उपलब्ध नाही (बाजारभावानुसार)"],
    [/No MSP/gi, "MSP उपलब्ध नाही"],
    [/market-based pricing/gi, "बाजारभावानुसार"],
    [/Not applicable/gi, "लागू नाही"],
    [/Basal Application/gi, "बेसल मात्रा"],
    [/Top Dressing/gi, "वरखत मात्रा"],
    [/First Top Dressing/gi, "पहिली वरखत मात्रा"],
    [/Second Top Dressing/gi, "दुसरी वरखत मात्रा"],
    [/Zinc Application/gi, "झिंक मात्रा"],
    [/Urea/gi, "Urea (नायट्रोजन खत)"],
    [/DAP/gi, "DAP (फॉस्फेट खत)"],
    [/MOP/gi, "MOP (पोटॅश खत)"],
    [/Irrigation/gi, "सिंचन"],
    [/Broadcasting/gi, "फवारणी/प्रसारण पद्धत"],
    [/Yield/gi, "उत्पादन"],
    [/Season/gi, "हंगाम"],
    [/Sowing/gi, "पेरणी"],
    [/Planting/gi, "लागवड"],
    [/Harvesting/gi, "कापणी"],
    [/disease/gi, "रोग"],
    [/pest/gi, "कीड"],
  ];
  for (const [pattern, value] of replacements) out = out.replace(pattern, value);
  return out;
}

function localizeRecord(record, language) {
  if (language !== "mr") return record;
  if (Array.isArray(record)) return record.map((item) => localizeRecord(item, language));
  if (!record || typeof record !== "object") {
    return typeof record === "string" ? translateTextToMarathi(record) : record;
  }

  const localized = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") {
      localized[key] = translateTextToMarathi(value);
    } else if (Array.isArray(value) || (value && typeof value === "object")) {
      localized[key] = localizeRecord(value, language);
    } else {
      localized[key] = value;
    }
  }
  return localized;
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
  if (!schedule.length) return "?? ??????: ?????? ????";

  const lines = ["?? ??????:"];
  for (let i = 0; i < Math.min(schedule.length, 5); i += 1) {
    const row = schedule[i] || {};
    const stage = row.stage || row.application_period || `????? ${i + 1}`;
    const dosage = row.dosage_per_acre || row.dosage || row.quantity || "?????? ????";
    lines.push(`${i + 1}. ${stage}: ${dosage}`);
  }
  return lines.join("\n");
}

function buildDiseaseSection(record = {}) {
  const diseases = normalizeArray(
    pickFirstExisting(record, ["major_diseases", "diseases", "disease_management"])
  );
  if (!diseases.length) return "???: ?????? ????";

  const lines = ["???:"];
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
    "?????? ????";
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : "?????? ????";

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    "?????? ????";
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : "?????? ????";

  return [
    heading,
    "",
    `?????: ${record.season || "?????? ????"}`,
    `?????/?????: ${record.sowing_time || record.sowing_or_planting_time || "?????? ????"}`,
    `?????: ${record.harvesting_time || "?????? ????"}`,
    `???????: ${yieldText}`,
    `MSP: ${mspText}`,
    buildFertilizerSection(record),
    buildDiseaseSection(record),
    "",
    "??????? ??????:",
    formatRecordAllFields(record),
  ].join("\n");
}

function buildBasicInfoSection(record = {}) {
  const rawYield =
    record.expected_yield_per_acre_quintals ||
    record.expected_yield ||
    record.yield ||
    "?????? ????";
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : "?????? ????";

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    "?????? ????";
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : "?????? ????";

  return [
    `?????: ${record.season || "?????? ????"}`,
    `?????/?????: ${record.sowing_time || record.sowing_or_planting_time || "?????? ????"}`,
    `?????: ${record.harvesting_time || "?????? ????"}`,
    `???????: ${yieldText}`,
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
          reply = `?? Rabi Crops\n${numberedList(rabiRecords.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        } else {
          const crops = await Crop.find({ season: /rabi/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "rabi_crop_list";
          session.rabiCropOptions = names;
          reply = `?? Rabi Crops\n${numberedList(names.map((n) => n.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        }
      } else if (input === "2") {
        const kharifRecords = readDatasetRecords("kharifData.json")
          .map((row) => ({ name: normalizedRecordName(row), record: row }))
          .filter((row) => row.name);
        if (kharifRecords.length) {
          session.step = "kharif_crop_list";
          session.kharifCropOptions = kharifRecords;
          reply = `??? Kharif Crops\n${numberedList(kharifRecords.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        } else {
          const crops = await Crop.find({ season: /kharif/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "kharif_crop_list";
          session.kharifCropOptions = names;
          reply = `??? Kharif Crops\n${numberedList(names.map((n) => n.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        }
      } else if (input === "3") {
        const cashRecords = readDatasetRecords("cash crops.json");
        if (cashRecords.length) {
          session.step = "cash_crop_list";
          session.cashCropOptions = cashRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Cash Crops\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        } else {
          const crops = await CashCrop.find({}).lean();
          session.step = "cash_crop_list";
          session.cashCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Cash Crops\n${numberedList(session.cashCropOptions.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        }
      } else if (input === "4") {
        const fruitRecords = readDatasetRecords("fruitcrops.json");
        if (fruitRecords.length) {
          session.step = "fruit_crop_list";
          session.fruitCropOptions = fruitRecords
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Fruit Crops\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        } else {
          const crops = await FruitCrop.find({}).lean();
          session.step = "fruit_crop_list";
          session.fruitCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row), record: row }))
            .filter((row) => row.name);
          reply = `?? Fruit Crops\n${numberedList(session.fruitCropOptions.map((r) => r.name))}\n\n?????????? ?????? ??????? ?????.\n0?? ?? ????? ????`;
        }
      } else if (input === "5") {
        session.step = "awaiting_crop_name";
        reply = "?? ?????? ??? ????? (???. Wheat, Mango, Cotton).";
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
          session.selectedCropRecord = localizeRecord(record, session.language);
          reply = buildCropInfoLanding(session.selectedCropRecord, selected.name);
        } else {
          reply = `${selected.name}\n\n?????? ?????? ????.\n0?? ?? ????? ????`;
        }
      } else {
        reply = "????? ????? ????? ?????? ??????? ?????.\n0?? ?? ????? ????";
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
          session.selectedCropRecord = localizeRecord(record, session.language);
          reply = buildCropInfoLanding(session.selectedCropRecord, selected.name);
        } else {
          reply = `${selected.name}\n\n?????? ?????? ????.\n0?? ?? ????? ????`;
        }
      } else {
        reply = "????? ????? ???? ?????? ??????? ?????.\n0?? ?? ????? ????";
      }
    } else if (session.step === "cash_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.cashCropOptions) ? session.cashCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || "Cash Crop";
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = localizeRecord(selected, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, cropName);
      } else {
        reply = "????? ????? ???? ?????? ??????? ?????.\n0?? ?? ????? ????";
      }
    } else if (session.step === "fruit_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.fruitCropOptions) ? session.fruitCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || "Fruit Crop";
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = localizeRecord(selected, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, cropName);
      } else {
        reply = "????? ????? ?? ?????? ??????? ?????.\n0?? ?? ????? ????";
      }
    } else if (session.step === "crop_info_type_menu") {
      const selectedRecord = session.selectedCropRecord || null;
      const selectedName = session.selectedCropName || "Crop";
      if (!selectedRecord) {
        session.step = "main_menu";
        reply = menuText();
      } else if (input === "1") {
        reply = [
          `${selectedName} ?? ??????????`,
          "",
          buildFertilizerSection(selectedRecord),
          "",
          cropInfoTypeMenuText(selectedName),
        ].join("\n");
      } else if (input === "2") {
        reply = [
          `${selectedName} ??? ??????`,
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
        reply = `????? ????? ??????? ?????.\n\n${moduleListText(session.activeModule)}`;
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
        session.selectedCropRecord = localizeRecord(matched.record, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, matched.heading);
      } else {
        session.step = "main_menu";
        reply = `??? "${input}" ?????? ????.\n0?? ?? ????? ????`;
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
      reply = "?? ?????? ????? ????? ????? ?????? ????.\n\n0?? ?? ????? ????";
    } else if (input === "0") {
      sessions.delete(from);
      reply = "?? AgriIndia ??? ????????????? ???????.\n???? ???? ??? ????, ?????? ??????! ??";
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
      .send(twiml("????????? ???? ??? ???. ????? ???????? 0 ?????."));
  }
});

module.exports = router;



