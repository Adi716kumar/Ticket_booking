const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Doesn't block the request if there's no/invalid token — just leaves
// req.user null. Used globally so views can render "logged in" nav state
// without every route needing to be protected.
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (err) {
    req.user = null;
    next();
  }
}

module.exports = optionalAuth;
