const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDb() {
  if (!mongoUri) throw new Error("MONGO_URI is missing");
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
}

module.exports = connectDb;
