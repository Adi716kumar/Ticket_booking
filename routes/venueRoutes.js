const express = require("express");

const router = express.Router();

const { createVenue } = require("../controllers/venueController");
const {createEvent} = require("../controllers/eventController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

router.post(
    "/",
    protect,
    authorize("organizer"),
    createEvent
);

module.exports = router;