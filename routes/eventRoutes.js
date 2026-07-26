const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { validate } = require("../middleware/validators/authValidators");
const { createEventRules } = require("../middleware/validators/eventValidators");

const {
  createEvent,
  getEvents,
  getEventById,
  getMyEvents,
  getEventStats,
} = require("../controllers/eventController");

// Public browsing — no auth required to see what's on.
router.get("/", getEvents);

router.get("/mine", protect, authorize("organizer"), getMyEvents);
router.get("/:id/stats", protect, authorize("organizer", "admin"), getEventStats);
router.get("/:id", getEventById);

router.post("/", protect, authorize("organizer"), createEventRules, validate, createEvent);

module.exports = router;
