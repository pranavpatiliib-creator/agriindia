const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .optional()
      .isIn(["admin", "farmer"])
      .withMessage("Role must be admin or farmer"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      throw new Error(errors.array()[0].msg);
    }

    const { username, password, role, adminKey } = req.body;

    const userExists = await User.findOne({ username });
    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    let resolvedRole = "farmer";

    if (role === "admin") {
      if (!process.env.ADMIN_REGISTER_KEY) {
        res.status(500);
        throw new Error("Admin registration is not configured");
      }

      if (adminKey !== process.env.ADMIN_REGISTER_KEY) {
        res.status(403);
        throw new Error("Invalid admin registration key");
      }

      resolvedRole = "admin";
    }

    const user = await User.create({
      username,
      password,
      role: resolvedRole,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: generateToken(user._id, user.role),
    });
  })
);

router.post(
  "/login",
  [
    body("username").notEmpty().withMessage("Username required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400);
      throw new Error(errors.array()[0].msg);
    }

    const { username, password } = req.body;

    const envAdminUsername = process.env.ADMIN_USERNAME;
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (
      envAdminUsername &&
      envAdminPassword &&
      username === envAdminUsername &&
      password === envAdminPassword
    ) {
      return res.status(200).json({
        success: true,
        message: "Login successful",
        token: generateToken("env-admin", "admin"),
      });
    }

    const user = await User.findOne({ username });
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error("Invalid credentials");
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      token: generateToken(user._id, user.role),
    });
  })
);

module.exports = router;
