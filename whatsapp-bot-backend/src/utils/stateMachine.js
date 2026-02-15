const Menu = require("../models/Menu");
const Crop = require("../models/Crop");
const Disease = require("../models/Disease");
const Fertilizer = require("../models/Fertilizer");
const modules = require("../services/modules");
const { sendButtons, sendList, sendText } = require("../services/whatsapp");

function getLang(user) {
  return user?.language || "en";
}

const I18N = {
  en: {
    back: "⬅ Back",
    mainMenu: "🏠 Main Menu",
    open: "Open",
    selectCrop: "Select Crop",
    chooseDisease: "Choose Disease",
    chooseFertilizer: "Choose Fertilizer",
    choose: "Choose",
    languagePrompt: "Select language",
    menuMissing: "Menu configuration missing.",
    cropInfoType: "Crop: {name}\n\nSelect Information Type:",
    diseases: "🦠 Diseases",
    fertilizers: "💊 Fertilizers",
    noCropsInCategory: "No crops found in {category} category.",
    noDiseasesForCrop: "No diseases found for {crop}.",
    noFertilizersForCrop: "No fertilizers found for {crop}.",
    noMsp: "No MSP records found.",
    noSubsidy: "No subsidy records found.",
    noLoan: "No loan records found.",
    noInsurance: "No insurance records found.",
    mspTitle: "💰 MSP",
    subsidyTitle: "🏛 Subsidy",
    loanTitle: "🏦 Loan",
    insuranceTitle: "🛡 Insurance",
    mspRecords: "MSP Records",
    subsidies: "Subsidies",
    loans: "Loans",
    insurances: "Insurance",
    diseaseMenu: "Disease Menu ({crop})",
    fertilizerMenu: "Fertilizer Menu ({crop})",
    invalidCategory: "Invalid category.",
    cropNotFound: "Crop not found.",
    selectedCropNotFound: "Selected crop not found.",
    diseaseNotFound: "Disease not found.",
    fertilizerNotFound: "Fertilizer not found.",
    mspNotFound: "MSP record not found.",
    subsidyNotFound: "Subsidy not found.",
    loanNotFound: "Loan not found.",
    insuranceNotFound: "Insurance not found.",
    invalidOption: "Invalid option. Please use menu buttons.",
    mainMenuTitle: "Main Menu",
    mainMenuPrompt: "MAIN MENU",
    cropInfo: "🌾 Crop Information",
    cropInfoDesc: "Kharif, Rabi, Cash, Fruit",
    mspDesc: "Minimum support price",
    subsidyDesc: "Government subsidy schemes",
    loanDesc: "Loan programs",
    insuranceDesc: "Insurance policies",
    cropCategoryTitle: "Crop Category",
    cropCategoryPrompt: "Select Crop Category:",
    kharifCrops: "🌱 Kharif Crops",
    kharifDesc: "Monsoon crops",
    rabiCrops: "❄ Rabi Crops",
    rabiDesc: "Winter crops",
    cashCrops: "💰 Cash Crops",
    cashDesc: "Commercial crops",
    fruitCrops: "🍎 Fruit Crops",
    fruitDesc: "Fruit varieties",
  },
  hi: {
    back: "⬅ वापस",
    mainMenu: "🏠 मुख्य मेनू",
    open: "खोलें",
    selectCrop: "फसल चुनें",
    chooseDisease: "रोग चुनें",
    chooseFertilizer: "उर्वरक चुनें",
    choose: "चुनें",
    languagePrompt: "भाषा चुनें",
    menuMissing: "मेनू कॉन्फ़िगरेशन उपलब्ध नहीं है।",
    cropInfoType: "फसल: {name}\n\nजानकारी का प्रकार चुनें:",
    diseases: "🦠 रोग",
    fertilizers: "💊 उर्वरक",
    noCropsInCategory: "{category} श्रेणी में कोई फसल नहीं मिली।",
    noDiseasesForCrop: "{crop} के लिए कोई रोग नहीं मिला।",
    noFertilizersForCrop: "{crop} के लिए कोई उर्वरक नहीं मिला।",
    noMsp: "कोई MSP रिकॉर्ड नहीं मिला।",
    noSubsidy: "कोई सब्सिडी रिकॉर्ड नहीं मिला।",
    noLoan: "कोई ऋण रिकॉर्ड नहीं मिला।",
    noInsurance: "कोई बीमा रिकॉर्ड नहीं मिला।",
    mspTitle: "💰 एमएसपी",
    subsidyTitle: "🏛 सब्सिडी",
    loanTitle: "🏦 ऋण",
    insuranceTitle: "🛡 बीमा",
    mspRecords: "एमएसपी रिकॉर्ड",
    subsidies: "सब्सिडी",
    loans: "ऋण",
    insurances: "बीमा",
    diseaseMenu: "रोग मेनू ({crop})",
    fertilizerMenu: "उर्वरक मेनू ({crop})",
    invalidCategory: "अमान्य श्रेणी।",
    cropNotFound: "फसल नहीं मिली।",
    selectedCropNotFound: "चयनित फसल नहीं मिली।",
    diseaseNotFound: "रोग नहीं मिला।",
    fertilizerNotFound: "उर्वरक नहीं मिला।",
    mspNotFound: "एमएसपी रिकॉर्ड नहीं मिला।",
    subsidyNotFound: "सब्सिडी नहीं मिली।",
    loanNotFound: "ऋण नहीं मिला।",
    insuranceNotFound: "बीमा नहीं मिला।",
    invalidOption: "अमान्य विकल्प। कृपया मेनू बटन का उपयोग करें।",
    mainMenuTitle: "मुख्य मेनू",
    mainMenuPrompt: "मुख्य मेनू",
    cropInfo: "🌾 फसल जानकारी",
    cropInfoDesc: "खरीफ, रबी, नकदी, फल",
    mspDesc: "न्यूनतम समर्थन मूल्य",
    subsidyDesc: "सरकारी सब्सिडी योजनाएं",
    loanDesc: "ऋण योजनाएं",
    insuranceDesc: "बीमा योजनाएं",
    cropCategoryTitle: "फसल श्रेणी",
    cropCategoryPrompt: "फसल श्रेणी चुनें:",
    kharifCrops: "🌱 खरीफ फसलें",
    kharifDesc: "मानसून फसलें",
    rabiCrops: "❄ रबी फसलें",
    rabiDesc: "शीतकालीन फसलें",
    cashCrops: "💰 नकदी फसलें",
    cashDesc: "व्यावसायिक फसलें",
    fruitCrops: "🍎 फल फसलें",
    fruitDesc: "फल की किस्में",
  },
  mr: {
    back: "⬅ मागे",
    mainMenu: "🏠 मुख्य मेनू",
    open: "उघडा",
    selectCrop: "पीक निवडा",
    chooseDisease: "रोग निवडा",
    chooseFertilizer: "खत निवडा",
    choose: "निवडा",
    languagePrompt: "भाषा निवडा",
    menuMissing: "मेनू संरचना उपलब्ध नाही.",
    cropInfoType: "पीक: {name}\n\nमाहितीचा प्रकार निवडा:",
    diseases: "🦠 रोग",
    fertilizers: "💊 खते",
    noCropsInCategory: "{category} प्रकारात पीक सापडले नाही.",
    noDiseasesForCrop: "{crop} साठी रोग सापडले नाहीत.",
    noFertilizersForCrop: "{crop} साठी खते सापडली नाहीत.",
    noMsp: "MSP नोंदी सापडल्या नाहीत.",
    noSubsidy: "अनुदान नोंदी सापडल्या नाहीत.",
    noLoan: "कर्ज नोंदी सापडल्या नाहीत.",
    noInsurance: "विमा नोंदी सापडल्या नाहीत.",
    mspTitle: "💰 एमएसपी",
    subsidyTitle: "🏛 अनुदान",
    loanTitle: "🏦 कर्ज",
    insuranceTitle: "🛡 विमा",
    mspRecords: "एमएसपी नोंदी",
    subsidies: "अनुदान",
    loans: "कर्ज",
    insurances: "विमा",
    diseaseMenu: "रोग मेनू ({crop})",
    fertilizerMenu: "खत मेनू ({crop})",
    invalidCategory: "अवैध प्रकार.",
    cropNotFound: "पीक सापडले नाही.",
    selectedCropNotFound: "निवडलेले पीक सापडले नाही.",
    diseaseNotFound: "रोग सापडला नाही.",
    fertilizerNotFound: "खत सापडले नाही.",
    mspNotFound: "एमएसपी नोंद सापडली नाही.",
    subsidyNotFound: "अनुदान सापडले नाही.",
    loanNotFound: "कर्ज सापडले नाही.",
    insuranceNotFound: "विमा सापडला नाही.",
    invalidOption: "अवैध पर्याय. कृपया मेनू बटणे वापरा.",
    mainMenuTitle: "मुख्य मेनू",
    mainMenuPrompt: "मुख्य मेनू",
    cropInfo: "🌾 पीक माहिती",
    cropInfoDesc: "खरीप, रबी, नगदी, फळे",
    mspDesc: "किमान आधारभूत किंमत",
    subsidyDesc: "शासकीय अनुदान योजना",
    loanDesc: "कर्ज योजना",
    insuranceDesc: "विमा योजना",
    cropCategoryTitle: "पीक प्रकार",
    cropCategoryPrompt: "पीक प्रकार निवडा:",
    kharifCrops: "🌱 खरीप पिके",
    kharifDesc: "पावसाळी पिके",
    rabiCrops: "❄ रबी पिके",
    rabiDesc: "हिवाळी पिके",
    cashCrops: "💰 नगदी पिके",
    cashDesc: "व्यावसायिक पिके",
    fruitCrops: "🍎 फळ पिके",
    fruitDesc: "फळांच्या जाती",
  },
};

function t(user, key, vars = {}) {
  const table = I18N[getLang(user)] || I18N.en;
  let msg = table[key] || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    msg = msg.replace(`{${k}}`, v);
  }
  return msg;
}

function navButtons(user) {
  return [
    { id: "nav_back", title: t(user, "back") },
    { id: "nav_main", title: t(user, "mainMenu") },
  ];
}

function compact(rows, max = 10) {
  return rows.slice(0, max);
}

function pushHistory(user, key) {
  if (!Array.isArray(user.state.history)) user.state.history = [];
  user.state.history.push(key);
}

async function sendMenu(user, menuKey) {
  const menu = await Menu.findOne({ key: menuKey }).lean();
  if (!menu) {
    await sendText(user.waId, t(user, "menuMissing"));
    return;
  }

  let options = [...menu.options];
  if (menuKey === "language_select") {
    options = [
      { id: "lang_en", title: "English", description: "English" },
      { id: "lang_hi", title: "हिंदी", description: "Hindi" },
      { id: "lang_mr", title: "मराठी", description: "Marathi" },
    ];
  }
  if (menuKey === "main_menu") {
    options = [
      { id: "crop_module", title: t(user, "cropInfo"), description: t(user, "cropInfoDesc"), nextMenuKey: "crop_category_menu" },
      { id: "msp_list", title: t(user, "mspTitle"), description: t(user, "mspDesc") },
      { id: "subsidy_list", title: t(user, "subsidyTitle"), description: t(user, "subsidyDesc") },
      { id: "loan_list", title: t(user, "loanTitle"), description: t(user, "loanDesc") },
      { id: "insurance_list", title: t(user, "insuranceTitle"), description: t(user, "insuranceDesc") },
    ];
  }
  if (menuKey === "crop_category_menu") {
    options = [
      { id: "crop_cat_kharif", title: t(user, "kharifCrops"), description: t(user, "kharifDesc") },
      { id: "crop_cat_rabi", title: t(user, "rabiCrops"), description: t(user, "rabiDesc") },
      { id: "crop_cat_cash", title: t(user, "cashCrops"), description: t(user, "cashDesc") },
      { id: "crop_cat_fruit", title: t(user, "fruitCrops"), description: t(user, "fruitDesc") },
    ];
  }

  if (menuKey !== "main_menu") options.push({ id: "nav_back", title: t(user, "back") });
  if (menuKey !== "main_menu") options.push({ id: "nav_main", title: t(user, "mainMenu") });

  const rows = compact(
    options.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description || "",
    }))
  );

  const prompt =
    menuKey === "language_select"
      ? t(user, "languagePrompt")
      : menuKey === "main_menu"
      ? t(user, "mainMenuPrompt")
      : menuKey === "crop_category_menu"
      ? t(user, "cropCategoryPrompt")
      : menu.prompt;
  const listTitle =
    menuKey === "main_menu"
      ? t(user, "mainMenuTitle")
      : menuKey === "crop_category_menu"
      ? t(user, "cropCategoryTitle")
      : menu.title;
  await sendList(user.waId, prompt, t(user, "open"), [{ title: listTitle, rows }]);
}

function categoryLabel(category) {
  const map = {
    Kharif: "🌱 KHARIF CROPS",
    Rabi: "❄ RABI CROPS",
    Cash: "💰 CASH CROPS",
    Fruit: "🍎 FRUIT CROPS",
  };
  return map[category] || `${category} CROPS`;
}

async function sendCropListByCategory(user, category) {
  const crops = await Crop.find({ category }, { name: 1 }).sort({ name: 1 }).lean();
  if (!crops.length) {
    await sendButtons(user.waId, t(user, "noCropsInCategory", { category }), navButtons(user));
    return;
  }

  const rows = compact(
    crops.map((crop) => ({
      id: `crop_select:${crop._id}`,
      title: crop.name,
      description: category,
    }))
  );

  await sendList(user.waId, categoryLabel(category), t(user, "selectCrop"), [{ title: categoryLabel(category), rows }]);
}

async function sendCropInfoTypeMenu(user, crop) {
  const text = t(user, "cropInfoType", { name: crop.name });
  await sendButtons(user.waId, text, [
    { id: "crop_info_diseases", title: t(user, "diseases") },
    { id: "crop_info_fertilizers", title: t(user, "fertilizers") },
    ...navButtons(user),
  ]);
}

async function sendDiseaseListForCrop(user, cropName) {
  const diseases = await Disease.find({ cropName }, { name: 1 }).sort({ name: 1 }).lean();
  if (!diseases.length) {
    await sendButtons(user.waId, t(user, "noDiseasesForCrop", { crop: cropName }), navButtons(user));
    return;
  }

  await sendList(user.waId, t(user, "diseaseMenu", { crop: cropName }), t(user, "chooseDisease"), [
    {
      title: t(user, "diseases"),
      rows: compact(
        diseases.map((d) => ({
          id: `disease:${d._id}`,
          title: d.name,
          description: cropName,
        }))
      ),
    },
  ]);
}

async function sendFertilizerListForCrop(user, cropName) {
  const fertilizers = await Fertilizer.find({ cropName }, { name: 1 }).sort({ name: 1 }).lean();
  if (!fertilizers.length) {
    await sendButtons(user.waId, t(user, "noFertilizersForCrop", { crop: cropName }), navButtons(user));
    return;
  }

  await sendList(user.waId, t(user, "fertilizerMenu", { crop: cropName }), t(user, "chooseFertilizer"), [
    {
      title: t(user, "fertilizers"),
      rows: compact(
        fertilizers.map((f) => ({
          id: `fertilizer:${f._id}`,
          title: f.name,
          description: cropName,
        }))
      ),
    },
  ]);
}

async function sendMspList(user) {
  const rows = await modules.msp.list();
  if (!rows.length) return sendButtons(user.waId, t(user, "noMsp"), navButtons(user));
  return sendList(user.waId, t(user, "mspTitle"), t(user, "choose"), [
    {
      title: t(user, "mspRecords"),
      rows: compact(
        rows.map((r) => ({
          id: `msp:${r._id}`,
          title: r.cropName,
          description: `INR ${r.amountPerQuintal}/quintal (${r.seasonYear})`,
        }))
      ),
    },
  ]);
}

async function sendSubsidyList(user) {
  const rows = await modules.subsidy.list();
  if (!rows.length) return sendButtons(user.waId, t(user, "noSubsidy"), navButtons(user));
  return sendList(user.waId, t(user, "subsidyTitle"), t(user, "choose"), [
    {
      title: t(user, "subsidies"),
      rows: compact(rows.map((r) => ({ id: `subsidy:${r._id}`, title: r.title, description: r.eligibility || "" }))),
    },
  ]);
}

async function sendLoanList(user) {
  const rows = await modules.loan.list();
  if (!rows.length) return sendButtons(user.waId, t(user, "noLoan"), navButtons(user));
  return sendList(user.waId, t(user, "loanTitle"), t(user, "choose"), [
    {
      title: t(user, "loans"),
      rows: compact(rows.map((r) => ({ id: `loan:${r._id}`, title: r.title, description: r.provider || "" }))),
    },
  ]);
}

async function sendInsuranceList(user) {
  const rows = await modules.insurance.list();
  if (!rows.length) return sendButtons(user.waId, t(user, "noInsurance"), navButtons(user));
  return sendList(user.waId, t(user, "insuranceTitle"), t(user, "choose"), [
    {
      title: t(user, "insurances"),
      rows: compact(rows.map((r) => ({ id: `insurance:${r._id}`, title: r.title, description: r.provider || "" }))),
    },
  ]);
}

async function renderState(user) {
  const key = user.state.currentMenuKey || "main_menu";

  if (key === "main_menu" || key === "crop_category_menu" || key === "language_select") {
    return sendMenu(user, key);
  }

  if (key === "crop_list_by_category") {
    return sendCropListByCategory(user, user.state.context?.selectedCategory);
  }

  if (key === "crop_info_type_menu") {
    const crop = await Crop.findById(user.state.context?.selectedCropId).lean();
    if (!crop) return sendButtons(user.waId, t(user, "selectedCropNotFound"), navButtons(user));
    return sendCropInfoTypeMenu(user, crop);
  }

  if (key === "disease_list_for_crop") {
    return sendDiseaseListForCrop(user, user.state.context?.selectedCropName);
  }

  if (key === "fertilizer_list_for_crop") {
    return sendFertilizerListForCrop(user, user.state.context?.selectedCropName);
  }

  if (key === "msp_list_dynamic") return sendMspList(user);
  if (key === "subsidy_list_dynamic") return sendSubsidyList(user);
  if (key === "loan_list_dynamic") return sendLoanList(user);
  if (key === "insurance_list_dynamic") return sendInsuranceList(user);

  return sendMenu(user, "main_menu");
}

async function handleAction(user, actionId) {
  if (actionId === "nav_main") {
    user.state.currentMenuKey = "main_menu";
    user.state.history = [];
    user.state.context = {};
    await user.save();
    return sendMenu(user, "main_menu");
  }

  if (actionId === "nav_back") {
    const previous = user.state.history.pop() || "main_menu";
    user.state.currentMenuKey = previous;
    await user.save();
    return renderState(user);
  }

  if (actionId === "lang_en" || actionId === "lang_hi" || actionId === "lang_mr") {
    const languageMap = { lang_en: "en", lang_hi: "hi", lang_mr: "mr" };
    user.language = languageMap[actionId];
    user.state.currentMenuKey = "main_menu";
    user.state.history = [];
    user.state.context = {};
    await user.save();
    return sendMenu(user, "main_menu");
  }

  if (actionId === "crop_module") {
    pushHistory(user, user.state.currentMenuKey || "main_menu");
    user.state.currentMenuKey = "crop_category_menu";
    await user.save();
    return sendMenu(user, "crop_category_menu");
  }

  if (actionId.startsWith("crop_cat_")) {
    const map = {
      crop_cat_kharif: "Kharif",
      crop_cat_rabi: "Rabi",
      crop_cat_cash: "Cash",
      crop_cat_fruit: "Fruit",
    };
    const selectedCategory = map[actionId];
    if (!selectedCategory) return sendButtons(user.waId, t(user, "invalidCategory"), navButtons(user));
    pushHistory(user, "crop_category_menu");
    user.state.currentMenuKey = "crop_list_by_category";
    user.state.context = { ...user.state.context, selectedCategory };
    await user.save();
    return sendCropListByCategory(user, selectedCategory);
  }

  if (actionId.startsWith("crop_select:")) {
    const crop = await Crop.findById(actionId.split(":")[1]).lean();
    if (!crop) return sendButtons(user.waId, t(user, "cropNotFound"), navButtons(user));
    pushHistory(user, "crop_list_by_category");
    user.state.currentMenuKey = "crop_info_type_menu";
    user.state.context = {
      ...user.state.context,
      selectedCropId: crop._id.toString(),
      selectedCropName: crop.name,
    };
    await user.save();
    return sendCropInfoTypeMenu(user, crop);
  }

  if (actionId === "crop_info_diseases") {
    pushHistory(user, "crop_info_type_menu");
    user.state.currentMenuKey = "disease_list_for_crop";
    await user.save();
    return sendDiseaseListForCrop(user, user.state.context?.selectedCropName);
  }

  if (actionId === "crop_info_fertilizers") {
    pushHistory(user, "crop_info_type_menu");
    user.state.currentMenuKey = "fertilizer_list_for_crop";
    await user.save();
    return sendFertilizerListForCrop(user, user.state.context?.selectedCropName);
  }

  if (actionId.startsWith("disease:")) {
    const item = await Disease.findById(actionId.split(":")[1]).lean();
    const text = item
      ? `Disease: ${item.name}\n\nSymptoms:\n${item.symptoms || "N/A"}\n\nTreatment:\n${item.treatment || "N/A"}\n\nRecommended Fertilizer:\n${item.recommendedFertilizer || "N/A"}`
      : t(user, "diseaseNotFound");
    return sendButtons(user.waId, text, navButtons(user));
  }

  if (actionId.startsWith("fertilizer:")) {
    const item = await Fertilizer.findById(actionId.split(":")[1]).lean();
    const text = item
      ? `Fertilizer: ${item.name}\n\nDosage:\n${item.dosagePerAcre || "N/A"}\n\nMethod:\n${item.method || "N/A"}\n\nBest Time:\n${item.bestTime || "N/A"}`
      : t(user, "fertilizerNotFound");
    return sendButtons(user.waId, text, navButtons(user));
  }

  if (actionId === "msp_list") {
    pushHistory(user, "main_menu");
    user.state.currentMenuKey = "msp_list_dynamic";
    await user.save();
    return sendMspList(user);
  }

  if (actionId === "subsidy_list") {
    pushHistory(user, "main_menu");
    user.state.currentMenuKey = "subsidy_list_dynamic";
    await user.save();
    return sendSubsidyList(user);
  }

  if (actionId === "loan_list") {
    pushHistory(user, "main_menu");
    user.state.currentMenuKey = "loan_list_dynamic";
    await user.save();
    return sendLoanList(user);
  }

  if (actionId === "insurance_list") {
    pushHistory(user, "main_menu");
    user.state.currentMenuKey = "insurance_list_dynamic";
    await user.save();
    return sendInsuranceList(user);
  }

  if (actionId.startsWith("msp:")) {
    const item = await modules.msp.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.msp.format(item) : t(user, "mspNotFound"), navButtons(user));
  }
  if (actionId.startsWith("subsidy:")) {
    const item = await modules.subsidy.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.subsidy.format(item) : t(user, "subsidyNotFound"), navButtons(user));
  }
  if (actionId.startsWith("loan:")) {
    const item = await modules.loan.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.loan.format(item) : t(user, "loanNotFound"), navButtons(user));
  }
  if (actionId.startsWith("insurance:")) {
    const item = await modules.insurance.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.insurance.format(item) : t(user, "insuranceNotFound"), navButtons(user));
  }

  await sendButtons(user.waId, t(user, "invalidOption"), [{ id: "nav_main", title: t(user, "mainMenu") }]);
}

async function processIncoming(user, actionId) {
  if (!user.language) {
    if (actionId === "lang_en" || actionId === "lang_hi" || actionId === "lang_mr") {
      return handleAction(user, actionId);
    }
    return sendButtons(user.waId, t(user, "languagePrompt"), [
      { id: "lang_en", title: "English" },
      { id: "lang_hi", title: "हिंदी" },
      { id: "lang_mr", title: "मराठी" },
    ]);
  }

  if (!actionId) return renderState(user);
  return handleAction(user, actionId);
}

module.exports = { processIncoming, sendMenu };
