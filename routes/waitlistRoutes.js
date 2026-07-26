const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validators/authValidators");
const { joinWaitlistRules } = require("../middleware/validators/waitlistValidators");

const { joinWaitlist, acceptOffer, getMyWaitlist } = require("../controllers/waitlistController");

router.post("/", protect, authorize("customer"), joinWaitlistRules, validate, joinWaitlist);
router.post("/:id/accept", protect, authorize("customer"), acceptOffer);
router.get("/my", protect, authorize("customer"), getMyWaitlist);

module.exports = router;
