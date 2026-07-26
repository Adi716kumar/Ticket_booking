const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validators/authValidators");
const { createVenueRules } = require("../middleware/validators/venueValidators");

const {
  createVenue,
  getAllVenues,
  getVenueById,
  deleteVenue,
} = require("../controllers/venueController");

router.get("/", protect, authorize("admin"), getAllVenues);
router.get("/:id", protect, authorize("admin", "organizer"), getVenueById);

router.post("/", protect, authorize("admin"), createVenueRules, validate, createVenue);
router.delete("/:id", protect, authorize("admin"), deleteVenue);

module.exports = router;
