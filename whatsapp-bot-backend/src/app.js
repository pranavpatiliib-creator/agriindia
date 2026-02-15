const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDb = require("./config/db");
const { port } = require("./config/env");
const webhookRoutes = require("./routes/webhook");
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/webhook", webhookRoutes);
app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((error) => {
    console.error("DB connection failed", error.message);
    process.exit(1);
  });
