const { body } = require("express-validator");

const createVenueRules = [
  body("name").trim().notEmpty().withMessage("Venue name is required"),
  body("location").trim().notEmpty().withMessage("Location is required"),
  body("totalRows").isInt({ min: 1, max: 26 }).withMessage("totalRows must be between 1 and 26"),
  body("totalColumns").isInt({ min: 1, max: 100 }).withMessage("totalColumns must be between 1 and 100"),
  body("premiumRows").isInt({ min: 0 }).withMessage("premiumRows must be 0 or more"),
];

module.exports = { createVenueRules };
