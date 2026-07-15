const express = require("express");

const router = express.Router();

const { createEvent, getEventSummary } = require("../controllers/eventController");

router.post("/", createEvent);
router.get("/:eventId/summary", getEventSummary);

module.exports = router;