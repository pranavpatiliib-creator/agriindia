require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const connectDB = require("./config/db");

// ✅ ROUTES IMPORT (ONLY ONCE)
const cropRoutes = require("./routes/cropRoutes");
const cashCropRoutes = require("./routes/cashCropRoutes");
const fruitCropRoutes = require("./routes/fruitCropRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const whatsappBotRoutes = require("./routes/whatsappBotRoutes");

connectDB();

const app = express();

// Render sits behind a reverse proxy. Trust exactly one hop in production
// so req.ip and express-rate-limit read X-Forwarded-For correctly.
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);

/* ==============================
   SECURITY & MIDDLEWARE
================================ */

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                scriptSrc: ["'self'", "'unsafe-inline'"],
                scriptSrcAttr: ["'unsafe-inline'"],
            },
        },
    })
);

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));

/* ==============================
   RATE LIMITERS
================================ */

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
});

app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

/* ==============================
   CLIENT IP TRACKING
================================ */

app.use((req, res, next) => {
    req.clientIp = req.ip || req.socket.remoteAddress;
    next();
});

/* ==============================
   ROUTES
================================ */

app.get("/", (req, res) => {
    res.send("AgriIndia Backend Running 🚀");
});
app.get("/favicon.ico", (req, res) => {
    res.status(204).end();
});

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/crops", cropRoutes);
app.use("/api/cash-crops", cashCropRoutes);
app.use("/api/fruit-crops", fruitCropRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/whatsapp", whatsappBotRoutes);

/* ==============================
   ERROR HANDLER (LAST)
================================ */

app.use(require("./middleware/errorHandler"));

/* ==============================
   START SERVER
================================ */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
);


