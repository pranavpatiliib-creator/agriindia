const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Allow admin login via environment credentials (no DB user id).
  if (decoded.id === "env-admin" && decoded.role === "admin") {
    req.user = {
      _id: "env-admin",
      username: process.env.ADMIN_USERNAME || "env-admin",
      role: "admin",
    };
    return next();
  }

  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

  req.user = user;
  next();
});

module.exports = protect;
