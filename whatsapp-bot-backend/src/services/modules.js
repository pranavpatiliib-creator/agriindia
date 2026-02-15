const Crop = require("../models/Crop");
const Disease = require("../models/Disease");
const Fertilizer = require("../models/Fertilizer");
const Msp = require("../models/Msp");
const Subsidy = require("../models/Subsidy");
const Loan = require("../models/Loan");
const Insurance = require("../models/Insurance");

const modules = {
  crop: {
    async list() {
      return Crop.find({}, { name: 1, season: 1 }).lean();
    },
    format(item) {
      return `Crop: ${item.name}\nSeason: ${item.season}\nSoil: ${item.soilType || "N/A"}\nWater: ${
        item.waterRequirement || "N/A"
      }\nDuration: ${item.durationDays || 0} days`;
    },
    model: Crop,
  },
  disease: {
    async list() {
      return Disease.find({}, { name: 1, cropName: 1 }).lean();
    },
    format(item) {
      return `Disease: ${item.name}\nCrop: ${item.cropName}\nSymptoms: ${item.symptoms || "N/A"}\nPrevention: ${
        item.prevention || "N/A"
      }\nTreatment: ${item.treatment || "N/A"}`;
    },
    model: Disease,
  },
  fertilizer: {
    async list() {
      return Fertilizer.find({}, { name: 1, cropName: 1 }).lean();
    },
    format(item) {
      return `Fertilizer: ${item.name}\nCrop: ${item.cropName}\nStage: ${item.stage || "N/A"}\nDosage: ${
        item.dosagePerAcre || "N/A"
      }\nMethod: ${item.method || "N/A"}\nBest Time: ${item.bestTime || "N/A"}`;
    },
    model: Fertilizer,
  },
  msp: {
    async list() {
      return Msp.find({}, { cropName: 1, amountPerQuintal: 1, seasonYear: 1 }).lean();
    },
    format(item) {
      return `MSP\nCrop: ${item.cropName}\nSeason: ${item.seasonYear}\nAmount: INR ${item.amountPerQuintal}/quintal`;
    },
    model: Msp,
  },
  subsidy: {
    async list() {
      return Subsidy.find({}, { title: 1, eligibility: 1 }).lean();
    },
    format(item) {
      return `Subsidy: ${item.title}\nEligibility: ${item.eligibility || "N/A"}\nBenefit: ${
        item.benefit || "N/A"
      }\nApply: ${item.applyUrl || "N/A"}`;
    },
    model: Subsidy,
  },
  loan: {
    async list() {
      return Loan.find({}, { title: 1, provider: 1 }).lean();
    },
    format(item) {
      return `Loan: ${item.title}\nProvider: ${item.provider || "N/A"}\nInterest: ${item.interestRate || "N/A"}\nMax Amount: ${
        item.maxAmount || "N/A"
      }\nEligibility: ${item.eligibility || "N/A"}`;
    },
    model: Loan,
  },
  insurance: {
    async list() {
      return Insurance.find({}, { title: 1, provider: 1 }).lean();
    },
    format(item) {
      return `Insurance: ${item.title}\nProvider: ${item.provider || "N/A"}\nCoverage: ${
        item.coverage || "N/A"
      }\nPremium: ${item.premiumInfo || "N/A"}\nClaim: ${item.claimProcess || "N/A"}`;
    },
    model: Insurance,
  },
};

module.exports = modules;
