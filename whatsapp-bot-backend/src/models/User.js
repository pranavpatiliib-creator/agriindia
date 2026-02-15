const mongoose = require("mongoose");

const userStateSchema = new mongoose.Schema(
  {
    currentMenuKey: { type: String, default: "language_select" },
    history: { type: [String], default: [] },
    module: { type: String, default: null },
    step: { type: String, default: null },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    waId: { type: String, required: true, unique: true, index: true },
    profileName: { type: String, default: "" },
    language: { type: String, enum: ["en"], default: null },
    state: { type: userStateSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
