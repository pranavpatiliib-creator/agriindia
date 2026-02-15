const Menu = require("../models/Menu");
const Crop = require("../models/Crop");
const Disease = require("../models/Disease");
const Fertilizer = require("../models/Fertilizer");
const modules = require("../services/modules");
const { sendButtons, sendList, sendText } = require("../services/whatsapp");

function navButtons() {
  return [
    { id: "nav_back", title: "⬅ Back" },
    { id: "nav_main", title: "🏠 Main Menu" },
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
    await sendText(user.waId, "Menu configuration missing.");
    return;
  }

  const options = [...menu.options];
  if (menuKey !== "main_menu") options.push({ id: "nav_back", title: "⬅ Back" });
  if (menuKey !== "main_menu") options.push({ id: "nav_main", title: "🏠 Main Menu" });

  const rows = compact(
    options.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description || "",
    }))
  );

  await sendList(user.waId, menu.prompt, "Open", [{ title: menu.title, rows }]);
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
    await sendButtons(user.waId, `No crops found in ${category} category.`, navButtons());
    return;
  }

  const rows = compact(
    crops.map((crop) => ({
      id: `crop_select:${crop._id}`,
      title: crop.name,
      description: category,
    }))
  );

  await sendList(user.waId, categoryLabel(category), "Select Crop", [{ title: categoryLabel(category), rows }]);
}

async function sendCropInfoTypeMenu(user, crop) {
  const text = `Crop: ${crop.name}\n\nSelect Information Type:`;
  await sendButtons(user.waId, text, [
    { id: "crop_info_diseases", title: "🦠 Diseases" },
    { id: "crop_info_fertilizers", title: "💊 Fertilizers" },
    ...navButtons(),
  ]);
}

async function sendDiseaseListForCrop(user, cropName) {
  const diseases = await Disease.find({ cropName }, { name: 1 }).sort({ name: 1 }).lean();
  if (!diseases.length) {
    await sendButtons(user.waId, `No diseases found for ${cropName}.`, navButtons());
    return;
  }

  await sendList(
    user.waId,
    `Disease Menu (${cropName})`,
    "Choose Disease",
    [
      {
        title: "Diseases",
        rows: compact(
          diseases.map((d) => ({
            id: `disease:${d._id}`,
            title: d.name,
            description: cropName,
          }))
        ),
      },
    ]
  );
}

async function sendFertilizerListForCrop(user, cropName) {
  const fertilizers = await Fertilizer.find({ cropName }, { name: 1 }).sort({ name: 1 }).lean();
  if (!fertilizers.length) {
    await sendButtons(user.waId, `No fertilizers found for ${cropName}.`, navButtons());
    return;
  }

  await sendList(
    user.waId,
    `Fertilizer Menu (${cropName})`,
    "Choose Fertilizer",
    [
      {
        title: "Fertilizers",
        rows: compact(
          fertilizers.map((f) => ({
            id: `fertilizer:${f._id}`,
            title: f.name,
            description: cropName,
          }))
        ),
      },
    ]
  );
}

async function sendMspList(user) {
  const rows = await modules.msp.list();
  if (!rows.length) return sendButtons(user.waId, "No MSP records found.", navButtons());
  return sendList(
    user.waId,
    "💰 MSP",
    "Choose",
    [
      {
        title: "MSP Records",
        rows: compact(
          rows.map((r) => ({
            id: `msp:${r._id}`,
            title: r.cropName,
            description: `INR ${r.amountPerQuintal}/quintal (${r.seasonYear})`,
          }))
        ),
      },
    ]
  );
}

async function sendSubsidyList(user) {
  const rows = await modules.subsidy.list();
  if (!rows.length) return sendButtons(user.waId, "No subsidy records found.", navButtons());
  return sendList(
    user.waId,
    "🏛 Subsidy",
    "Choose",
    [{ title: "Subsidies", rows: compact(rows.map((r) => ({ id: `subsidy:${r._id}`, title: r.title, description: r.eligibility || "" }))) }]
  );
}

async function sendLoanList(user) {
  const rows = await modules.loan.list();
  if (!rows.length) return sendButtons(user.waId, "No loan records found.", navButtons());
  return sendList(
    user.waId,
    "🏦 Loan",
    "Choose",
    [{ title: "Loans", rows: compact(rows.map((r) => ({ id: `loan:${r._id}`, title: r.title, description: r.provider || "" }))) }]
  );
}

async function sendInsuranceList(user) {
  const rows = await modules.insurance.list();
  if (!rows.length) return sendButtons(user.waId, "No insurance records found.", navButtons());
  return sendList(
    user.waId,
    "🛡 Insurance",
    "Choose",
    [{ title: "Insurance", rows: compact(rows.map((r) => ({ id: `insurance:${r._id}`, title: r.title, description: r.provider || "" }))) }]
  );
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
    if (!crop) return sendButtons(user.waId, "Selected crop not found.", navButtons());
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

  if (actionId === "lang_en") {
    user.language = "en";
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
    if (!selectedCategory) return sendButtons(user.waId, "Invalid category.", navButtons());
    pushHistory(user, "crop_category_menu");
    user.state.currentMenuKey = "crop_list_by_category";
    user.state.context = { ...user.state.context, selectedCategory };
    await user.save();
    return sendCropListByCategory(user, selectedCategory);
  }

  if (actionId.startsWith("crop_select:")) {
    const crop = await Crop.findById(actionId.split(":")[1]).lean();
    if (!crop) return sendButtons(user.waId, "Crop not found.", navButtons());
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
      ? `Disease: ${item.name}\n\nSymptoms:\n${item.symptoms || "N/A"}\n\nTreatment:\n${
          item.treatment || "N/A"
        }\n\nRecommended Fertilizer:\n${item.recommendedFertilizer || "N/A"}`
      : "Disease not found.";
    return sendButtons(user.waId, text, navButtons());
  }

  if (actionId.startsWith("fertilizer:")) {
    const item = await Fertilizer.findById(actionId.split(":")[1]).lean();
    const text = item
      ? `Fertilizer: ${item.name}\n\nDosage:\n${item.dosagePerAcre || "N/A"}\n\nMethod:\n${
          item.method || "N/A"
        }\n\nBest Time:\n${item.bestTime || "N/A"}`
      : "Fertilizer not found.";
    return sendButtons(user.waId, text, navButtons());
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
    return sendButtons(user.waId, item ? modules.msp.format(item) : "MSP record not found.", navButtons());
  }
  if (actionId.startsWith("subsidy:")) {
    const item = await modules.subsidy.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.subsidy.format(item) : "Subsidy not found.", navButtons());
  }
  if (actionId.startsWith("loan:")) {
    const item = await modules.loan.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.loan.format(item) : "Loan not found.", navButtons());
  }
  if (actionId.startsWith("insurance:")) {
    const item = await modules.insurance.model.findById(actionId.split(":")[1]).lean();
    return sendButtons(user.waId, item ? modules.insurance.format(item) : "Insurance not found.", navButtons());
  }

  await sendButtons(user.waId, "Invalid option. Please use menu buttons.", [{ id: "nav_main", title: "🏠 Main Menu" }]);
}

async function processIncoming(user, actionId) {
  if (!user.language) {
    if (actionId === "lang_en") return handleAction(user, actionId);
    return sendButtons(user.waId, "Select language", [{ id: "lang_en", title: "English" }]);
  }

  if (!actionId) return renderState(user);
  return handleAction(user, actionId);
}

module.exports = { processIncoming, sendMenu };
