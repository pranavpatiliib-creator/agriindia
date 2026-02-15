const express = require("express");
const crudFactory = require("./crudFactory");
const Menu = require("../models/Menu");
const User = require("../models/User");
const Crop = require("../models/Crop");
const Disease = require("../models/Disease");
const Fertilizer = require("../models/Fertilizer");
const Msp = require("../models/Msp");
const Subsidy = require("../models/Subsidy");
const Loan = require("../models/Loan");
const Insurance = require("../models/Insurance");

const router = express.Router();

router.use("/menus", crudFactory(Menu));
router.use("/users", crudFactory(User));
router.use("/crops", crudFactory(Crop));
router.use("/diseases", crudFactory(Disease));
router.use("/fertilizers", crudFactory(Fertilizer));
router.use("/msp", crudFactory(Msp));
router.use("/subsidies", crudFactory(Subsidy));
router.use("/loans", crudFactory(Loan));
router.use("/insurance", crudFactory(Insurance));

module.exports = router;
