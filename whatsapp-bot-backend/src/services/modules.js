const Crop = require("../models/Crop");
const Disease = require("../models/Disease");
const Fertilizer = require("../models/Fertilizer");
const Msp = require("../models/Msp");
const Subsidy = require("../models/Subsidy");
const Loan = require("../models/Loan");
const Insurance = require("../models/Insurance");

function labels(lang = "en") {
  const map = {
    en: {
      crop: "Crop",
      season: "Season",
      soil: "Soil",
      water: "Water",
      duration: "Duration",
      days: "days",
      disease: "Disease",
      symptoms: "Symptoms",
      prevention: "Prevention",
      treatment: "Treatment",
      fertilizer: "Fertilizer",
      stage: "Stage",
      dosage: "Dosage",
      method: "Method",
      bestTime: "Best Time",
      msp: "MSP",
      amount: "Amount",
      subsidy: "Subsidy",
      eligibility: "Eligibility",
      benefit: "Benefit",
      apply: "Apply",
      loan: "Loan",
      provider: "Provider",
      interest: "Interest",
      maxAmount: "Max Amount",
      insurance: "Insurance",
      coverage: "Coverage",
      premium: "Premium",
      claim: "Claim",
      na: "N/A",
    },
    hi: {
      crop: "फसल",
      season: "सीजन",
      soil: "मिट्टी",
      water: "पानी",
      duration: "अवधि",
      days: "दिन",
      disease: "रोग",
      symptoms: "लक्षण",
      prevention: "रोकथाम",
      treatment: "उपचार",
      fertilizer: "उर्वरक",
      stage: "चरण",
      dosage: "मात्रा",
      method: "विधि",
      bestTime: "उत्तम समय",
      msp: "एमएसपी",
      amount: "राशि",
      subsidy: "सब्सिडी",
      eligibility: "पात्रता",
      benefit: "लाभ",
      apply: "आवेदन",
      loan: "ऋण",
      provider: "प्रदाता",
      interest: "ब्याज",
      maxAmount: "अधिकतम राशि",
      insurance: "बीमा",
      coverage: "कवरेज",
      premium: "प्रीमियम",
      claim: "दावा",
      na: "उपलब्ध नहीं",
    },
    mr: {
      crop: "पीक",
      season: "हंगाम",
      soil: "माती",
      water: "पाणी",
      duration: "कालावधी",
      days: "दिवस",
      disease: "रोग",
      symptoms: "लक्षणे",
      prevention: "प्रतिबंध",
      treatment: "उपचार",
      fertilizer: "खत",
      stage: "अवस्था",
      dosage: "मात्रा",
      method: "पद्धत",
      bestTime: "योग्य वेळ",
      msp: "एमएसपी",
      amount: "रक्कम",
      subsidy: "अनुदान",
      eligibility: "पात्रता",
      benefit: "लाभ",
      apply: "अर्ज",
      loan: "कर्ज",
      provider: "पुरवठादार",
      interest: "व्याज",
      maxAmount: "कमाल रक्कम",
      insurance: "विमा",
      coverage: "कव्हरेज",
      premium: "प्रीमियम",
      claim: "दावा",
      na: "उपलब्ध नाही",
    },
  };
  return map[lang] || map.en;
}

const modules = {
  crop: {
    async list() {
      return Crop.find({}, { name: 1, season: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.crop}: ${item.name}\n${l.season}: ${item.season}\n${l.soil}: ${item.soilType || l.na}\n${l.water}: ${
        item.waterRequirement || l.na
      }\n${l.duration}: ${item.durationDays || 0} ${l.days}`;
    },
    model: Crop,
  },
  disease: {
    async list() {
      return Disease.find({}, { name: 1, cropName: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.disease}: ${item.name}\n${l.crop}: ${item.cropName}\n${l.symptoms}: ${item.symptoms || l.na}\n${l.prevention}: ${
        item.prevention || l.na
      }\n${l.treatment}: ${item.treatment || l.na}`;
    },
    model: Disease,
  },
  fertilizer: {
    async list() {
      return Fertilizer.find({}, { name: 1, cropName: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.fertilizer}: ${item.name}\n${l.crop}: ${item.cropName}\n${l.stage}: ${item.stage || l.na}\n${l.dosage}: ${
        item.dosagePerAcre || l.na
      }\n${l.method}: ${item.method || l.na}\n${l.bestTime}: ${item.bestTime || l.na}`;
    },
    model: Fertilizer,
  },
  msp: {
    async list() {
      return Msp.find({}, { cropName: 1, amountPerQuintal: 1, seasonYear: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.msp}\n${l.crop}: ${item.cropName}\n${l.season}: ${item.seasonYear}\n${l.amount}: INR ${item.amountPerQuintal}/quintal`;
    },
    model: Msp,
  },
  subsidy: {
    async list() {
      return Subsidy.find({}, { title: 1, eligibility: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.subsidy}: ${item.title}\n${l.eligibility}: ${item.eligibility || l.na}\n${l.benefit}: ${
        item.benefit || l.na
      }\n${l.apply}: ${item.applyUrl || l.na}`;
    },
    model: Subsidy,
  },
  loan: {
    async list() {
      return Loan.find({}, { title: 1, provider: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.loan}: ${item.title}\n${l.provider}: ${item.provider || l.na}\n${l.interest}: ${item.interestRate || l.na}\n${l.maxAmount}: ${
        item.maxAmount || l.na
      }\n${l.eligibility}: ${item.eligibility || l.na}`;
    },
    model: Loan,
  },
  insurance: {
    async list() {
      return Insurance.find({}, { title: 1, provider: 1 }).lean();
    },
    format(item, lang = "en") {
      const l = labels(lang);
      return `${l.insurance}: ${item.title}\n${l.provider}: ${item.provider || l.na}\n${l.coverage}: ${
        item.coverage || l.na
      }\n${l.premium}: ${item.premiumInfo || l.na}\n${l.claim}: ${item.claimProcess || l.na}`;
    },
    model: Insurance,
  },
};

module.exports = modules;
