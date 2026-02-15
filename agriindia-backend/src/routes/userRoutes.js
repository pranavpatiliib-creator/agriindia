const express = require("express");

const protect = require("../middleware/protect");
const authorize = require("../middleware/authorize");
const asyncHandler = require("../middleware/asyncHandler");
const User = require("../models/User");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password");
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  })
);

router.get(
  "/:id",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  })
);

router.put(
  "/:id/role",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    if (!role || !["admin", "farmer"].includes(role)) {
      res.status(400);
      throw new Error("Invalid role");
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
    });
  })
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  })
);

module.exports = router;
