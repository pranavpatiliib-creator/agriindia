const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    nextMenuKey: { type: String, default: null },
    action: { type: String, default: null },
  },
  { _id: false }
);

const menuSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
    type: { type: String, enum: ["button", "list"], default: "button" },
    options: { type: [optionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema);
