const { body } = require("express-validator");

const joinWaitlistRules = [
  body("eventId").isMongoId().withMessage("A valid eventId is required"),
  body("category").isIn(["Premium", "Standard"]).withMessage("category must be Premium or Standard"),
];

module.exports = { joinWaitlistRules };
