const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { validate, registerRules, loginRules } = require("../middleware/validators/authValidators");

const {
  registerCustomer,
  registerOrganizer,
  login,
  logout,
  getMe,
} = require("../controllers/authController");

// Public — always creates a customer account.
router.post("/register", registerRules, validate, registerCustomer);

router.post("/login", loginRules, validate, login);
router.post("/logout", logout);
router.get("/me", protect, getMe);

// Admin-only — the only way an organizer account gets created.
router.post(
  "/register-organizer",
  protect,
  authorize("admin"),
  registerRules,
  validate,
  registerOrganizer
);

module.exports = router;
