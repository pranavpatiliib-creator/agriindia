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
      type: "Crop insurance",
      who_can_apply: "Loanee and non-loanee farmers",
      coverage: "Yield loss due to natural risks",
      premium: "Kharif 2%, Rabi 1.5%, Commercial/Horticulture 5%",
      where_to_apply: "Nearby CSC, participating bank branch, https://pmfby.gov.in",
    },
    {
      name: "Weather Based Crop Insurance Scheme (WBCIS)",
      type: "Weather-indexed insurance",
      who_can_apply: "Farmers in notified areas",
      coverage: "Weather-linked crop loss",
      premium: "As per state and season rules",
      where_to_apply: "CSC, authorized insurer, state agriculture office",
    },
    {
      name: "Coconut Palm Insurance Scheme (CPIS)",
      type: "Plantation insurance",
      who_can_apply: "Coconut growers",
      coverage: "Loss of palms due to natural causes",
      premium: "As per age slab and scheme terms",
      where_to_apply: "Coconut Development Board and partner insurers",
    },
  ],
  subsidies: [
    {
      name: "PM-KISAN",
      benefit: "Direct income support to eligible farmer families",
      eligibility: "Eligible landholding farmer families as per scheme rules",
      where_to_apply: "https://pmkisan.gov.in, local agriculture office, CSC",
    },
    {
      name: "Soil Health Card Scheme",
      benefit: "Soil testing with nutrient recommendations",
      eligibility: "All farmers",
      where_to_apply: "District agriculture office / soil testing lab",
    },
    {
      name: "PMKSY (Micro Irrigation Subsidy)",
      benefit: "Subsidy for drip and sprinkler irrigation",
      eligibility: "Farmers adopting micro-irrigation",
      where_to_apply: "State agriculture/horticulture portal and offices",
    },
  ],
  loan: [
    {
      name: "Kisan Credit Card (KCC)",
      provider: "Banks and cooperative institutions",
      interest_rate: "As per bank/NABARD norms",
      max_amount: "Based on landholding and cropping pattern",
      where_to_apply: "Nearby bank branch / online banking portal",
    },
    {
      name: "Agriculture Term Loan",
      provider: "Public and private sector banks",
      interest_rate: "As per bank policy",
      max_amount: "Based on project and eligibility",
      where_to_apply: "Nearby bank branch with project report",
    },
    {
      name: "NABARD Supported Farm Loans",
      provider: "Partner banks and regional rural banks",
      interest_rate: "As per applicable subsidy and bank policy",
      max_amount: "Based on scheme and project",
      where_to_apply: "Partner bank branch and district development office",
    },
  ],
  msp: [
    {
      name: "MSP for Wheat",
      crop: "Wheat",
      rate: "Check latest notified MSP",
      season_year: "Rabi procurement season",
      where_to_apply: "Procurement center / mandi / state portal",
    },
    {
      name: "MSP for Paddy",
      crop: "Paddy",
      rate: "Check latest notified MSP",
      season_year: "Kharif procurement season",
      where_to_apply: "Procurement center / mandi / state portal",
    },
    {
      name: "MSP for Cotton",
      crop: "Cotton",
      rate: "Check latest notified MSP",
      season_year: "Kharif procurement season",
      where_to_apply: "Cotton procurement center / mandi",
    },
  ],
};

const I18N = {
  en: {
    bot_welcome: "Welcome to AgriIndia Bot",
    reply_with_number: "Reply with a number:",
    menu_option_1: "1. Crop information",
    menu_option_2: "2. Insurance schemes",
    menu_option_3: "3. Subsidy schemes",
    menu_option_4: "4. Farm loans",
    menu_option_5: "5. MSP information",
    menu_option_7: "7. Talk to support",
    menu_option_0: "0. Reset session",
    menu_send_valid: "Send a valid option.",
    crop_info_title: "Crop information",
    crop_option_1: "1. Rabi crops",
    crop_option_2: "2. Kharif crops",
    crop_option_3: "3. Cash crops",
    crop_option_4: "4. Fruit crops",
    crop_option_5: "5. Search crop by name",
    heading_rabi: "Rabi Crops",
    heading_kharif: "Kharif Crops",
    heading_cash: "Cash Crops",
    heading_fruit: "Fruit Crops",
    crop_fallback_cash: "Cash Crop",
    crop_fallback_fruit: "Fruit Crop",
    crop_fallback: "Crop",
    crop_back_main: "0. Back to main menu",
    info_type_prompt: "Reply with a number:",
    info_option_fertilizer: "1. Fertilizer schedule",
    info_option_disease: "2. Disease / pest info",
    back_main: "0. Back to main menu",
    module_insurance: "Insurance schemes",
    module_subsidies: "Subsidy schemes",
    module_loan: "Farm loans",
    module_msp: "MSP information",
    msp_all_heading: "MSP of all crops",
    msp_kharif_heading: "Kharif Crops - MSP for 2026-27 (Rs per quintal)",
    msp_kharif_source: "(Source: Govt of India - MSP Notification)",
    msp_rabi_heading: "Rabi Crops - MSP for 2026-27 (Rs per quintal)",
    msp_rabi_source: "(Source: Official Government Notification)",
    module_default: "Schemes",
    available_schemes: "Available schemes:",
    no_records: "No records found.",
    not_available: "Not available",
    detailed_record: "Detailed record:",
    season: "Season",
    sowing: "Sowing/Planting",
    harvesting: "Harvesting",
    expected_yield: "Expected yield",
    fertilizer_schedule: "Fertilizer schedule",
    diseases: "Diseases",
    stage: "Stage",
    disease_label: "Disease",
    reply_crop_select: "Reply with a number to view crop details.",
    send_crop_name: "Send crop name (example: Wheat, Mango, Cotton).",
    detailed_not_available: "Detailed info is not available.",
    invalid_crop_selection: "Invalid selection. Please choose a crop number.",
    fertilizer_heading_suffix: " - Fertilizer schedule",
    disease_heading_suffix: " - Disease / pest info",
    invalid_scheme_selection: "Invalid scheme selection.",
    crop_not_found: 'Crop "{input}" not found.',
    support_unavailable: "Support feature is not configured yet.",
    session_ended: "You have exited AgriIndia bot.",
    restart_hint: "Send any message to start again.",
    error_fallback: "Something went wrong. Please try again or send 0.",
    welcome_mode: "Welcome to AgriIndia.",
    item: "Item",
  },
  mr: {
    bot_welcome: "AgriIndia Bot मध्ये स्वागत आहे",
    reply_with_number: "कृपया क्रमांक पाठवा:",
    menu_option_1: "1. पिकांची माहिती",
    menu_option_2: "2. विमा योजना",
    menu_option_3: "3. अनुदान योजना",
    menu_option_4: "4. कृषी कर्ज",
    menu_option_5: "5. MSP माहिती",
    menu_option_7: "7. सपोर्टशी बोला",
    menu_option_0: "0. सेशन रीसेट करा",
    menu_send_valid: "कृपया योग्य पर्याय पाठवा.",
    crop_info_title: "पिकांची माहिती",
    crop_option_1: "1. रब्बी पिके",
    crop_option_2: "2. खरीप पिके",
    crop_option_3: "3. नगदी पिके",
    crop_option_4: "4. फळ पिके",
    crop_option_5: "5. नावाने पीक शोधा",
    heading_rabi: "रब्बी पिके",
    heading_kharif: "खरीप पिके",
    heading_cash: "नगदी पिके",
    heading_fruit: "फळ पिके",
    crop_fallback_cash: "नगदी पीक",
    crop_fallback_fruit: "फळ पीक",
    crop_fallback: "पीक",
    crop_back_main: "0. मुख्य मेनूकडे जा",
    info_type_prompt: "कृपया क्रमांक पाठवा:",
    info_option_fertilizer: "1. खत वेळापत्रक",
    info_option_disease: "2. रोग / किड माहिती",
    back_main: "0. मुख्य मेनूकडे जा",
    module_insurance: "विमा योजना",
    module_subsidies: "अनुदान योजना",
    module_loan: "कृषी कर्ज",
    module_msp: "MSP माहिती",
    module_default: "योजना",
    available_schemes: "उपलब्ध योजना:",
    no_records: "नोंदी सापडल्या नाहीत.",
    not_available: "उपलब्ध नाही",
    detailed_record: "सविस्तर नोंद:",
    season: "हंगाम",
    sowing: "पेरणी/लागवड",
    harvesting: "कापणी",
    expected_yield: "अपेक्षित उत्पादन",
    fertilizer_schedule: "खत वेळापत्रक",
    diseases: "रोग/किड",
    stage: "टप्पा",
    disease_label: "रोग",
    reply_crop_select: "तपशील पाहण्यासाठी क्रमांक पाठवा.",
    send_crop_name: "पीकाचे नाव पाठवा (उदा. Wheat, Mango, Cotton).",
    detailed_not_available: "सविस्तर माहिती उपलब्ध नाही.",
    invalid_crop_selection: "चुकीची निवड. कृपया पीक क्रमांक निवडा.",
    fertilizer_heading_suffix: " - खत वेळापत्रक",
    disease_heading_suffix: " - रोग / किड माहिती",
    invalid_scheme_selection: "चुकीची योजना निवड.",
    crop_not_found: 'पीक "{input}" सापडले नाही.',
    support_unavailable: "सपोर्ट सुविधा अजून उपलब्ध नाही.",
    session_ended: "तुम्ही AgriIndia bot मधून बाहेर पडला आहात.",
    restart_hint: "पुन्हा सुरू करण्यासाठी कोणताही मेसेज पाठवा.",
    error_fallback: "काहीतरी चूक झाली. पुन्हा प्रयत्न करा किंवा 0 पाठवा.",
    welcome_mode: "AgriIndia मध्ये आपले स्वागत आहे.",
    item: "घटक",
  },
  hi: {
    bot_welcome: "AgriIndia Bot में आपका स्वागत है",
    reply_with_number: "कृपया नंबर भेजें:",
    menu_option_1: "1. फसल जानकारी",
    menu_option_2: "2. बीमा योजनाएं",
    menu_option_3: "3. सब्सिडी योजनाएं",
    menu_option_4: "4. कृषि ऋण",
    menu_option_5: "5. MSP जानकारी",
    menu_option_7: "7. सपोर्ट से बात करें",
    menu_option_0: "0. सत्र रीसेट करें",
    menu_send_valid: "कृपया सही विकल्प भेजें।",
    crop_info_title: "फसल जानकारी",
    crop_option_1: "1. रबी फसलें",
    crop_option_2: "2. खरीफ फसलें",
    crop_option_3: "3. नकदी फसलें",
    crop_option_4: "4. फल फसलें",
    crop_option_5: "5. नाम से फसल खोजें",
    heading_rabi: "रबी फसलें",
    heading_kharif: "खरीफ फसलें",
    heading_cash: "नकदी फसलें",
    heading_fruit: "फल फसलें",
    crop_fallback_cash: "नकदी फसल",
    crop_fallback_fruit: "फल फसल",
    crop_fallback: "फसल",
    crop_back_main: "0. मुख्य मेनू पर जाएं",
    info_type_prompt: "कृपया नंबर भेजें:",
    info_option_fertilizer: "1. उर्वरक अनुसूची",
    info_option_disease: "2. रोग / कीट जानकारी",
    back_main: "0. मुख्य मेनू पर जाएं",
    module_insurance: "बीमा योजनाएं",
    module_subsidies: "सब्सिडी योजनाएं",
    module_loan: "कृषि ऋण",
    module_msp: "MSP जानकारी",
    module_default: "योजनाएं",
    available_schemes: "उपलब्ध योजनाएं:",
    no_records: "कोई रिकॉर्ड नहीं मिला।",
    not_available: "उपलब्ध नहीं",
    detailed_record: "विस्तृत रिकॉर्ड:",
    season: "मौसम",
    sowing: "बुवाई/रोपाई",
    harvesting: "कटाई",
    expected_yield: "अपेक्षित उत्पादन",
    fertilizer_schedule: "उर्वरक अनुसूची",
    diseases: "रोग/कीट",
    stage: "चरण",
    disease_label: "रोग",
    reply_crop_select: "विवरण देखने के लिए नंबर भेजें।",
    send_crop_name: "फसल का नाम भेजें (उदा. Wheat, Mango, Cotton).",
    detailed_not_available: "विस्तृत जानकारी उपलब्ध नहीं है।",
    invalid_crop_selection: "गलत चयन। कृपया फसल का नंबर चुनें।",
    fertilizer_heading_suffix: " - उर्वरक अनुसूची",
    disease_heading_suffix: " - रोग / कीट जानकारी",
    invalid_scheme_selection: "गलत योजना चयन।",
    crop_not_found: 'फसल "{input}" नहीं मिली।',
    support_unavailable: "सपोर्ट सुविधा अभी उपलब्ध नहीं है।",
    session_ended: "आप AgriIndia bot से बाहर निकल चुके हैं।",
    restart_hint: "फिर से शुरू करने के लिए कोई भी संदेश भेजें।",
    error_fallback: "कुछ गलत हो गया। फिर कोशिश करें या 0 भेजें।",
    welcome_mode: "AgriIndia में आपका स्वागत है।",
    item: "आइटम",
  },
};

const TITLE_MAP = {
  en: {
    name: "Name",
    type: "Type",
    who_can_apply: "Who can apply",
    coverage: "Coverage",
    premium: "Premium",
    where_to_apply: "Where to apply",
    benefit: "Benefit",
    eligibility: "Eligibility",
    provider: "Provider",
    interest_rate: "Interest rate",
    max_amount: "Max amount",
    crop: "Crop",
    rate: "Rate",
    season_year: "Season/Year",
  },
  mr: {
    name: "नाव",
    type: "प्रकार",
    who_can_apply: "कोण अर्ज करू शकतो",
    coverage: "संरक्षण",
    premium: "प्रीमियम",
    where_to_apply: "अर्ज कुठे करावा",
    benefit: "लाभ",
    eligibility: "पात्रता",
    provider: "प्रदाता",
    interest_rate: "व्याजदर",
    max_amount: "कमाल रक्कम",
    crop: "पीक",
    rate: "दर",
    season_year: "हंगाम/वर्ष",
  },
  hi: {
    name: "नाम",
    type: "प्रकार",
    who_can_apply: "कौन आवेदन कर सकता है",
    coverage: "कवरेज",
    premium: "प्रीमियम",
    where_to_apply: "कहां आवेदन करें",
    benefit: "लाभ",
    eligibility: "पात्रता",
    provider: "प्रदाता",
    interest_rate: "ब्याज दर",
    max_amount: "अधिकतम राशि",
    crop: "फसल",
    rate: "दर",
    season_year: "मौसम/वर्ष",
  },
};

const TRANSLATION_REPLACEMENTS = {
  mr: [
    [/No MSP \(market-based pricing\)/gi, "MSP उपलब्ध नाही (बाजारभावानुसार)"],
    [/No MSP/gi, "MSP उपलब्ध नाही"],
    [/market-based pricing/gi, "बाजारभावानुसार"],
    [/Not applicable/gi, "लागू नाही"],
    [/Basal Application/gi, "बेसल मात्रा"],
    [/Top Dressing/gi, "वरखत मात्रा"],
    [/First Top Dressing/gi, "पहिली वरखत मात्रा"],
    [/Second Top Dressing/gi, "दुसरी वरखत मात्रा"],
    [/Zinc Application/gi, "झिंक मात्रा"],
    [/Irrigation/gi, "सिंचन"],
    [/Broadcasting/gi, "प्रसारण पद्धत"],
    [/Yield/gi, "उत्पादन"],
    [/Season/gi, "हंगाम"],
    [/Sowing/gi, "पेरणी"],
    [/Planting/gi, "लागवड"],
    [/Harvesting/gi, "कापणी"],
    [/disease/gi, "रोग"],
    [/pest/gi, "किड"],
  ],
  hi: [
    [/No MSP \(market-based pricing\)/gi, "MSP उपलब्ध नहीं (बाजार आधारित मूल्य)"],
    [/No MSP/gi, "MSP उपलब्ध नहीं"],
    [/market-based pricing/gi, "बाजार आधारित मूल्य"],
    [/Not applicable/gi, "लागू नहीं"],
    [/Basal Application/gi, "बेसल मात्रा"],
    [/Top Dressing/gi, "टॉप ड्रेसिंग मात्रा"],
    [/First Top Dressing/gi, "पहली टॉप ड्रेसिंग मात्रा"],
    [/Second Top Dressing/gi, "दूसरी टॉप ड्रेसिंग मात्रा"],
    [/Zinc Application/gi, "जिंक मात्रा"],
    [/Irrigation/gi, "सिंचाई"],
    [/Broadcasting/gi, "प्रसारण विधि"],
    [/Yield/gi, "उत्पादन"],
    [/Season/gi, "मौसम"],
    [/Sowing/gi, "बुवाई"],
    [/Planting/gi, "रोपाई"],
    [/Harvesting/gi, "कटाई"],
    [/disease/gi, "रोग"],
    [/pest/gi, "कीट"],
  ],
};

function normalizeLanguage(language = "en") {
  return ["mr", "hi"].includes(language) ? language : "en";
}

function t(language, key) {
  const lang = normalizeLanguage(language);
  return I18N[lang]?.[key] || I18N.en[key] || key;
}

function tf(language, key, values = {}) {
  let out = t(language, key);
  for (const [name, value] of Object.entries(values)) {
    out = out.replaceAll(`{${name}}`, String(value));
  }
  return out;
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value) !== "";
}

function localizedFieldValue(record = {}, baseKey = "", language = "en") {
  const lang = normalizeLanguage(language);
  if (lang === "en") return record?.[baseKey];

  const localizedKey = `${baseKey}_${lang}`;
  if (hasValue(record?.[localizedKey])) return record[localizedKey];
  return record?.[baseKey];
}

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

function twiml(message, maxLen = 1400) {
  const parts = splitMessage(message, maxLen);
  const payload = parts.map((part) => `<Message>${escapeXml(part)}</Message>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${payload}</Response>`;
}

function menuText(language = "en") {
  return [
    t(language, "bot_welcome"),
    "",
    t(language, "reply_with_number"),
    "",
    t(language, "menu_option_1"),
    t(language, "menu_option_2"),
    t(language, "menu_option_3"),
    t(language, "menu_option_4"),
    t(language, "menu_option_5"),
    t(language, "menu_option_7"),
    t(language, "menu_option_0"),
    "",
    t(language, "menu_send_valid"),
  ].join("\n");
}

function cropMenuText(language = "en") {
  return [
    t(language, "crop_info_title"),
    "",
    t(language, "reply_with_number"),
    "",
    t(language, "crop_option_1"),
    t(language, "crop_option_2"),
    t(language, "crop_option_3"),
    t(language, "crop_option_4"),
    t(language, "crop_option_5"),
    t(language, "crop_back_main"),
    "",
    t(language, "menu_send_valid"),
  ].join("\n");
}

function cropInfoTypeMenuText(name = "Crop", language = "en") {
  return [
    `${name}`,
    "",
    t(language, "info_type_prompt"),
    t(language, "info_option_fertilizer"),
    t(language, "info_option_disease"),
    t(language, "back_main"),
  ].join("\n");
}

function moduleTitle(moduleKey = "", language = "en") {
  const map = {
    insurance: t(language, "module_insurance"),
    subsidies: t(language, "module_subsidies"),
    loan: t(language, "module_loan"),
    msp: t(language, "module_msp"),
  };
  return map[moduleKey] || t(language, "module_default");
}

function moduleListText(moduleKey = "", language = "en") {
  const schemes = MODULE_SCHEMES[moduleKey] || [];
  return [
    moduleTitle(moduleKey, language),
    "",
    t(language, "available_schemes"),
    numberedList(schemes.map((s) => s.name), language),
    t(language, "back_main"),
  ].join("\n");
}

function moduleDetailText(moduleKey = "", scheme = {}, language = "en") {
  return [
    `${scheme.name || moduleTitle(moduleKey, language)}`,
    "",
    formatRecordAllFields(scheme, "", language),
    "",
    t(language, "back_main"),
  ].join("\n");
}

function languagePrompt() {
  return [
    "Welcome to AgriIndia | AgriIndia मध्ये आपले स्वागत आहे | AgriIndia में आपका स्वागत है",
    "",
    "Please choose your language / कृपया भाषा निवडा / कृपया भाषा चुनें:",
    "1. English",
    "2. मराठी",
    "3. हिंदी",
    "",
    "Send only 1, 2, or 3.",
  ].join("\n");
}

function welcomeByLanguage(language) {
  return t(language, "welcome_mode");
}

function shortList(items, field = "name", limit = 15, language = "en") {
  const names = items
    .map((item) => item?.[field])
    .filter(Boolean)
    .slice(0, limit);
  if (names.length === 0) return t(language, "no_records");
  return names.join(", ");
}

function numberedList(items = [], language = "en") {
  if (!items.length) return t(language, "no_records");
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function numberedListFromItems(items = [], field = "name", language = "en") {
  const names = items
    .map((item) => String(item?.[field] || "").trim())
    .filter(Boolean);
  return numberedList(names, language);
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

function normalizedRecordName(row = {}, language = "en") {
  const name = localizedFieldValue(row, "name", language);
  const cropName = localizedFieldValue(row, "crop_name", language);
  return String(name || cropName || "").trim();
}

function toTitle(key = "", language = "en") {
  const lang = normalizeLanguage(language);
  const map = TITLE_MAP[lang] || TITLE_MAP.en;
  if (map[key]) return map[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAny(value, indent = "", language = "en") {
  if (Array.isArray(value)) {
    if (!value.length) return `${indent}- ${t(language, "not_available")}`;
    return value
      .map((item, index) => {
        if (item && typeof item === "object") {
          return `${indent}- ${t(language, "item")} ${index + 1}\n${formatRecordAllFields(item, `${indent}  `, language)}`;
        }
        return `${indent}- ${String(item)}`;
      })
      .join("\n");
  }

  if (value && typeof value === "object") {
    return formatRecordAllFields(value, `${indent}`, language);
  }

  if (value === null || value === undefined || value === "") return `${indent}${t(language, "not_available")}`;
  return `${indent}${String(value)}`;
}

function formatRecordAllFields(record, indent = "", language = "en") {
  return Object.entries(record || {})
    .map(([key, value]) => {
      if (Array.isArray(value) || (value && typeof value === "object")) {
        return `${indent}${toTitle(key, language)}:\n${formatAny(value, `${indent}  `, language)}`;
      }
      return `${indent}${toTitle(key, language)}: ${formatAny(value, "", language)}`;
    })
    .join("\n");
}

function translateTextToLanguage(text = "", language = "en") {
  let out = String(text);
  const replacements = TRANSLATION_REPLACEMENTS[normalizeLanguage(language)] || [];
  for (const [pattern, value] of replacements) out = out.replace(pattern, value);
  return out;
}

function localizeRecord(record, language) {
  const lang = normalizeLanguage(language);
  if (lang === "en") return record;
  if (Array.isArray(record)) return record.map((item) => localizeRecord(item, language));
  if (!record || typeof record !== "object") {
    return typeof record === "string" ? translateTextToLanguage(record, language) : record;
  }

  const localized = {};

  // First, map base keys to language-specific values where *_hi/*_mr exists.
  for (const [key, value] of Object.entries(record)) {
    if (/_hi$|_mr$/i.test(key)) continue;

    const resolvedValue = localizedFieldValue(record, key, language);
    if (typeof resolvedValue === "string") {
      localized[key] = translateTextToLanguage(resolvedValue, language);
    } else if (Array.isArray(resolvedValue) || (resolvedValue && typeof resolvedValue === "object")) {
      localized[key] = localizeRecord(resolvedValue, language);
    } else if (typeof value === "string") {
      localized[key] = translateTextToLanguage(value, language);
    } else if (Array.isArray(value) || (value && typeof value === "object")) {
      localized[key] = localizeRecord(value, language);
    } else {
      localized[key] = value;
    }
  }

  // If dataset only has suffixed key and no base key, expose it using base key name.
  const suffix = `_${lang}`;
  for (const [key, value] of Object.entries(record)) {
    if (!key.endsWith(suffix)) continue;
    const baseKey = key.slice(0, -suffix.length);
    if (Object.prototype.hasOwnProperty.call(localized, baseKey)) continue;

    if (typeof value === "string") {
      localized[baseKey] = translateTextToLanguage(value, language);
    } else if (Array.isArray(value) || (value && typeof value === "object")) {
      localized[baseKey] = localizeRecord(value, language);
    } else {
      localized[baseKey] = value;
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

function mspValueFromRecord(record = {}, language = "en") {
  const raw =
    localizedFieldValue(record, "msp_rupees_per_quintal", language) ||
    localizedFieldValue(record, "minimum_support_price", language) ||
    localizedFieldValue(record, "msp", language);

  const value = String(raw || "").trim();
  if (!value) return t(language, "not_available");

  const normalized = value.toLowerCase();
  if (["n/a", "na", "not applicable"].includes(normalized)) {
    return t(language, "not_available");
  }
  return value;
}

function buildAllCropsMspText(language = "en") {
  const kharif = [
    "Paddy - Common: 2,369",
    "Paddy - Grade A: 2,389",
    "Jowar - Hybrid: 3,699",
    "Jowar - Maldandi: 3,749",
    "Bajra: 2,775",
    "Ragi: 4,290",
    "Maize: 2,400 (approx)",
    "Tur / Arhar: 8,000 (approx)",
    "Moong: 8,682 (approx)",
    "Urad: 7,400 (approx)",
    "Groundnut: 6,783 (approx)",
    "Sunflower Seed: 7,280 (approx)",
    "Soyabean (Yellow): 5,328 (approx)",
    "Sesamum (Til): 9,267 (approx)",
    "Nigerseed: 8,717 (approx)",
    "Cotton - Medium Staple: 7,710",
    "Cotton - Long Staple: 8,110",
  ];

  const rabi = [
    "Wheat: 2,585",
    "Barley: 2,150",
    "Gram (Chana): 5,875",
    "Lentil (Masur): 7,000",
    "Rapeseed & Mustard: 6,200",
    "Safflower: 6,54",
  ];

  return [
    t(language, "msp_all_heading"),
    "",
    t(language, "msp_kharif_heading"),
    t(language, "msp_kharif_source"),
    "",
    ...kharif,
    "",
    t(language, "msp_rabi_heading"),
    t(language, "msp_rabi_source"),
    "",
    ...rabi,
    "",
    t(language, "back_main"),
  ].join("\n");
}

function buildFertilizerSection(record = {}, language = "en") {
  const schedule = normalizeArray(
    pickFirstExisting(record, ["fertilizer_schedule", "fertilizerSchedule"])
  );
  if (!schedule.length) return `${t(language, "fertilizer_schedule")}: ${t(language, "not_available")}`;

  const lines = [`${t(language, "fertilizer_schedule")}:`];
  for (let i = 0; i < Math.min(schedule.length, 5); i += 1) {
    const row = schedule[i] || {};
    const stage = row.stage || row.application_period || `${t(language, "stage")} ${i + 1}`;
    const dosage = row.dosage_per_acre || row.dosage || row.quantity || t(language, "not_available");
    lines.push(`${i + 1}. ${stage}: ${dosage}`);
  }
  return lines.join("\n");
}

function buildDiseaseSection(record = {}, language = "en") {
  const diseases = normalizeArray(
    pickFirstExisting(record, ["major_diseases", "diseases", "disease_management"])
  );
  if (!diseases.length) return `${t(language, "diseases")}: ${t(language, "not_available")}`;

  const lines = [`${t(language, "diseases")}:`];
  for (let i = 0; i < Math.min(diseases.length, 5); i += 1) {
    const row = diseases[i] || {};
    const diseaseName = row.disease_name || row.name || row.disease || `${t(language, "disease_label")} ${i + 1}`;
    lines.push(`${i + 1}. ${diseaseName}`);
  }
  return lines.join("\n");
}

function formatCropResponse(record = {}, heading = "Crop", language = "en") {
  const rawYield =
    record.expected_yield_per_acre_quintals ||
    record.expected_yield ||
    record.yield ||
    t(language, "not_available");
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : t(language, "not_available");

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    t(language, "not_available");
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : t(language, "not_available");

  return [
    heading,
    "",
    `${t(language, "season")}: ${record.season || t(language, "not_available")}`,
    `${t(language, "sowing")}: ${record.sowing_time || record.sowing_or_planting_time || t(language, "not_available")}`,
    `${t(language, "harvesting")}: ${record.harvesting_time || t(language, "not_available")}`,
    `${t(language, "expected_yield")}: ${yieldText}`,
    `MSP: ${mspText}`,
    buildFertilizerSection(record, language),
    buildDiseaseSection(record, language),
    "",
    t(language, "detailed_record"),
    formatRecordAllFields(record, "", language),
  ].join("\n");
}

function buildBasicInfoSection(record = {}, language = "en") {
  const rawYield =
    record.expected_yield_per_acre_quintals ||
    record.expected_yield ||
    record.yield ||
    t(language, "not_available");
  const yieldText =
    rawYield && String(rawYield).toLowerCase() !== "n/a"
      ? `${rawYield} quintal/acre`
      : t(language, "not_available");

  const rawMsp =
    record.msp_rupees_per_quintal ||
    record.msp ||
    record.minimum_support_price ||
    t(language, "not_available");
  const mspText =
    rawMsp && String(rawMsp).toLowerCase() !== "n/a"
      ? `Rs ${rawMsp} per quintal`
      : t(language, "not_available");

  return [
    `${t(language, "season")}: ${record.season || t(language, "not_available")}`,
    `${t(language, "sowing")}: ${record.sowing_time || record.sowing_or_planting_time || t(language, "not_available")}`,
    `${t(language, "harvesting")}: ${record.harvesting_time || t(language, "not_available")}`,
    `${t(language, "expected_yield")}: ${yieldText}`,
    `MSP: ${mspText}`,
  ].join("\n");
}

function buildCropInfoLanding(record = {}, heading = "Crop", language = "en") {
  return [
    heading,
    "",
    buildBasicInfoSection(record, language),
    "",
    cropInfoTypeMenuText(heading, language),
  ].join("\n");
}

async function findCropRecordByName(name, language = "en") {
  const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const normalizedName = String(name || "").trim().toLowerCase();
  const lang = normalizeLanguage(language);

  const datasets = [
    ...readDatasetRecords("rabiData.json"),
    ...readDatasetRecords("kharifData.json"),
    ...readDatasetRecords("cash crops.json"),
    ...readDatasetRecords("fruitcrops.json"),
  ];

  const datasetMatch = datasets.find((row) => {
    const candidates = [
      normalizedRecordName(row, "en"),
      normalizedRecordName(row, lang),
      String(row?.name_hi || "").trim(),
      String(row?.name_mr || "").trim(),
      String(row?.crop_name_hi || "").trim(),
      String(row?.crop_name_mr || "").trim(),
    ]
      .filter(Boolean)
      .map((v) => v.toLowerCase());
    return candidates.includes(normalizedName);
  });

  if (datasetMatch) {
    const heading = normalizedRecordName(datasetMatch, lang) || t(lang, "crop_fallback");
    return { heading, record: datasetMatch };
  }

  const [crop, cashCrop, fruitCrop] = await Promise.all([
    Crop.findOne({ name: regex }).lean(),
    CashCrop.findOne({ crop_name: regex }).lean(),
    FruitCrop.findOne({ crop_name: regex }).lean(),
  ]);

  if (crop) {
    return { heading: crop.name || t(lang, "crop_fallback"), record: crop };
  }

  const special = cashCrop || fruitCrop;
  if (special) {
    return { heading: special.crop_name || special.name || t(lang, "crop_fallback"), record: special };
  }

  return null;
}

router.post("/webhook", async (req, res, next) => {
  const from = (req.body?.From || "unknown").trim();
  try {
    const input = (req.body?.Body || "").trim();
    const lowerInput = input.toLowerCase();
    const session = sessions.get(from) || { step: "main_menu" };

    let reply = "";
    let maxReplyLen = 1400;

    if (!session.language) {
      const selectedLanguage = LANGUAGE_MAP[input];
      if (!selectedLanguage) {
        reply = languagePrompt();
      } else {
        session.language = selectedLanguage;
        session.step = "main_menu";
        reply = `${welcomeByLanguage(selectedLanguage)}\n\n${menuText(selectedLanguage)}`;
      }
    } else if (!input || ["hi", "hello", "menu", "start", "help"].includes(lowerInput)) {
      session.step = "main_menu";
      reply = menuText(session.language);
    } else if (session.step === "crop_menu") {
      if (input === "1") {
        const rabiRecords = readDatasetRecords("rabiData.json")
          .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
          .filter((row) => row.name);
        if (rabiRecords.length) {
          session.step = "rabi_crop_list";
          session.rabiCropOptions = rabiRecords;
          reply = `${t(session.language, "heading_rabi")}\n${numberedList(rabiRecords.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        } else {
          const crops = await Crop.find({ season: /rabi/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "rabi_crop_list";
          session.rabiCropOptions = names;
          reply = `${t(session.language, "heading_rabi")}\n${numberedList(names.map((n) => n.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        }
      } else if (input === "2") {
        const kharifRecords = readDatasetRecords("kharifData.json")
          .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
          .filter((row) => row.name);
        if (kharifRecords.length) {
          session.step = "kharif_crop_list";
          session.kharifCropOptions = kharifRecords;
          reply = `${t(session.language, "heading_kharif")}\n${numberedList(kharifRecords.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        } else {
          const crops = await Crop.find({ season: /kharif/i }).lean();
          const names = crops.map((c) => ({ name: String(c?.name || "").trim(), record: c })).filter((c) => c.name);
          session.step = "kharif_crop_list";
          session.kharifCropOptions = names;
          reply = `${t(session.language, "heading_kharif")}\n${numberedList(names.map((n) => n.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        }
      } else if (input === "3") {
        const cashRecords = readDatasetRecords("cash crops.json");
        if (cashRecords.length) {
          session.step = "cash_crop_list";
          session.cashCropOptions = cashRecords
            .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
            .filter((row) => row.name);
          reply = `${t(session.language, "heading_cash")}\n${numberedList(session.cashCropOptions.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        } else {
          const crops = await CashCrop.find({}).lean();
          session.step = "cash_crop_list";
          session.cashCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
            .filter((row) => row.name);
          reply = `${t(session.language, "heading_cash")}\n${numberedList(session.cashCropOptions.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        }
      } else if (input === "4") {
        const fruitRecords = readDatasetRecords("fruitcrops.json");
        if (fruitRecords.length) {
          session.step = "fruit_crop_list";
          session.fruitCropOptions = fruitRecords
            .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
            .filter((row) => row.name);
          reply = `${t(session.language, "heading_fruit")}\n${numberedList(session.fruitCropOptions.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        } else {
          const crops = await FruitCrop.find({}).lean();
          session.step = "fruit_crop_list";
          session.fruitCropOptions = crops
            .map((row) => ({ name: normalizedRecordName(row, session.language), record: row }))
            .filter((row) => row.name);
          reply = `${t(session.language, "heading_fruit")}\n${numberedList(session.fruitCropOptions.map((r) => r.name), session.language)}\n\n${t(session.language, "reply_crop_select")}\n${t(session.language, "back_main")}`;
        }
      } else if (input === "5") {
        session.step = "awaiting_crop_name";
        reply = t(session.language, "send_crop_name");
      } else {
        session.step = "main_menu";
        reply = menuText(session.language);
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
          reply = buildCropInfoLanding(session.selectedCropRecord, selected.name, session.language);
        } else {
          reply = `${selected.name}\n\n${t(session.language, "detailed_not_available")}\n${t(session.language, "back_main")}`;
        }
      } else {
        reply = `${t(session.language, "invalid_crop_selection")}\n${t(session.language, "back_main")}`;
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
          reply = buildCropInfoLanding(session.selectedCropRecord, selected.name, session.language);
        } else {
          reply = `${selected.name}\n\n${t(session.language, "detailed_not_available")}\n${t(session.language, "back_main")}`;
        }
      } else {
        reply = `${t(session.language, "invalid_crop_selection")}\n${t(session.language, "back_main")}`;
      }
    } else if (session.step === "cash_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.cashCropOptions) ? session.cashCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || t(session.language, "crop_fallback_cash");
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = localizeRecord(selected, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, cropName, session.language);
      } else {
        reply = `${t(session.language, "invalid_crop_selection")}\n${t(session.language, "back_main")}`;
      }
    } else if (session.step === "fruit_crop_list") {
      const selectedIndex = Number.parseInt(input, 10) - 1;
      const records = Array.isArray(session.fruitCropOptions) ? session.fruitCropOptions : [];
      const selected = records[selectedIndex]?.record || null;
      if (selected) {
        const cropName = selected.crop_name || selected.name || t(session.language, "crop_fallback_fruit");
        session.step = "crop_info_type_menu";
        session.selectedCropName = cropName;
        session.selectedCropRecord = localizeRecord(selected, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, cropName, session.language);
      } else {
        reply = `${t(session.language, "invalid_crop_selection")}\n${t(session.language, "back_main")}`;
      }
    } else if (session.step === "crop_info_type_menu") {
      const selectedRecord = session.selectedCropRecord || null;
      const selectedName = session.selectedCropName || t(session.language, "crop_fallback");
      if (!selectedRecord) {
        session.step = "main_menu";
        reply = menuText(session.language);
      } else if (input === "1") {
        reply = [
          `${selectedName}${t(session.language, "fertilizer_heading_suffix")}`,
          "",
          buildFertilizerSection(selectedRecord, session.language),
          "",
          cropInfoTypeMenuText(selectedName, session.language),
        ].join("\n");
      } else if (input === "2") {
        reply = [
          `${selectedName}${t(session.language, "disease_heading_suffix")}`,
          "",
          buildDiseaseSection(selectedRecord, session.language),
          "",
          cropInfoTypeMenuText(selectedName, session.language),
        ].join("\n");
      } else {
        session.step = "main_menu";
        reply = menuText(session.language);
      }
    } else if (session.step === "module_list") {
      if (session.activeModule === "msp") {
        session.step = "main_menu";
        session.activeModule = null;
        reply = buildAllCropsMspText(session.language);
        maxReplyLen = 4096;
      } else {
        const schemes = MODULE_SCHEMES[session.activeModule] || [];
        const selectedIndex = Number.parseInt(input, 10) - 1;
        const selected = schemes[selectedIndex] || null;
        if (selected) {
          const localizedScheme = localizeRecord(selected, session.language);
          session.step = "module_detail";
          session.selectedScheme = localizedScheme;
          reply = moduleDetailText(session.activeModule, localizedScheme, session.language);
        } else {
          reply = `${t(session.language, "invalid_scheme_selection")}\n\n${moduleListText(session.activeModule, session.language)}`;
        }
      }
    } else if (session.step === "module_detail") {
      if (input === "0") {
        session.step = "main_menu";
        session.activeModule = null;
        session.selectedScheme = null;
        reply = menuText(session.language);
      } else {
        reply = moduleDetailText(
          session.activeModule,
          localizeRecord(session.selectedScheme || {}, session.language),
          session.language
        );
      }
    } else if (session.step === "awaiting_crop_name") {
      const matched = await findCropRecordByName(input, session.language);
      if (matched?.record) {
        session.step = "crop_info_type_menu";
        session.selectedCropName = matched.heading;
        session.selectedCropRecord = localizeRecord(matched.record, session.language);
        reply = buildCropInfoLanding(session.selectedCropRecord, matched.heading, session.language);
      } else {
        session.step = "main_menu";
        reply = `${tf(session.language, "crop_not_found", { input })}\n${t(session.language, "back_main")}`;
      }
    } else if (input === "1") {
      session.step = "crop_menu";
      reply = cropMenuText(session.language);
    } else if (input === "2") {
      session.step = "module_list";
      session.activeModule = "insurance";
      reply = moduleListText("insurance", session.language);
    } else if (input === "3") {
      session.step = "module_list";
      session.activeModule = "subsidies";
      reply = moduleListText("subsidies", session.language);
    } else if (input === "4") {
      session.step = "module_list";
      session.activeModule = "loan";
      reply = moduleListText("loan", session.language);
    } else if (input === "5") {
      session.step = "main_menu";
      session.activeModule = null;
      reply = buildAllCropsMspText(session.language);
      maxReplyLen = 4096;
    } else if (input === "7") {
      reply = `${t(session.language, "support_unavailable")}\n\n${t(session.language, "back_main")}`;
    } else if (input === "0") {
      sessions.delete(from);
      reply = `${t(session.language, "session_ended")}\n${t(session.language, "restart_hint")}`;
    } else {
      reply = menuText(session.language);
      session.step = "main_menu";
    }

    if (input !== "0") {
      sessions.set(from, session);
    }
    res.status(200).type("text/xml").send(twiml(reply, maxReplyLen));
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    const fallbackLanguage = sessions.get(from)?.language || "en";
    // Always return TwiML so Twilio can send a fallback reply instead of silently failing.
    return res
      .status(200)
      .type("text/xml")
      .send(twiml(t(fallbackLanguage, "error_fallback")));
  }
});

module.exports = router;




