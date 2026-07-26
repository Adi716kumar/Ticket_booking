const { body } = require("express-validator");

const createEventRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("type").isIn(["Movie", "Concert"]).withMessage("Type must be Movie or Concert"),
  body("venueId").isMongoId().withMessage("A valid venue must be selected"),
  body("date").isISO8601().withMessage("A valid date is required"),
  body("startTime")
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage("startTime must be in HH:MM 24-hour format"),
  body("durationMinutes")
    .optional()
    .isInt({ min: 30 })
    .withMessage("durationMinutes must be at least 30"),
  body("pricing.Premium").isFloat({ min: 0 }).withMessage("Premium price must be 0 or more"),
  body("pricing.Standard").isFloat({ min: 0 }).withMessage("Standard price must be 0 or more"),
];

module.exports = { createEventRules };
