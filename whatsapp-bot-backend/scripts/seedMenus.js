const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Menu = require("../src/models/Menu");

dotenv.config();

const menus = [
  {
    key: "language_select",
    title: "Language",
    prompt: "Select language",
    type: "button",
    options: [
      { id: "lang_en", title: "English", description: "English", nextMenuKey: "main_menu" },
      { id: "lang_hi", title: "हिंदी", description: "Hindi", nextMenuKey: "main_menu" },
      { id: "lang_mr", title: "मराठी", description: "Marathi", nextMenuKey: "main_menu" },
    ],
  },
  {
    key: "main_menu",
    title: "Main Menu",
    prompt: "MAIN MENU\n\n1) 🌾 Crop Information\n2) 💰 MSP\n3) 🏛 Subsidy\n4) 🏦 Loan\n5) 🛡 Insurance",
    type: "list",
    options: [
      { id: "crop_module", title: "🌾 Crop Information", description: "Kharif, Rabi, Cash, Fruit", nextMenuKey: "crop_category_menu" },
      { id: "msp_list", title: "💰 MSP", description: "Minimum support price" },
      { id: "subsidy_list", title: "🏛 Subsidy", description: "Government subsidy schemes" },
      { id: "loan_list", title: "🏦 Loan", description: "Loan programs" },
      { id: "insurance_list", title: "🛡 Insurance", description: "Insurance policies" },
    ],
  },
  {
    key: "crop_category_menu",
    title: "Crop Category",
    prompt: "Select Crop Category:",
    type: "list",
    options: [
      { id: "crop_cat_kharif", title: "🌱 Kharif Crops", description: "Monsoon crops" },
      { id: "crop_cat_rabi", title: "❄ Rabi Crops", description: "Winter crops" },
      { id: "crop_cat_cash", title: "💰 Cash Crops", description: "Commercial crops" },
      { id: "crop_cat_fruit", title: "🍎 Fruit Crops", description: "Fruit varieties" },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Menu.deleteMany({});
  await Menu.insertMany(menus);
  console.log("Menus seeded");
  await mongoose.connection.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
