const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");
const { getSeatMap, holdSeats } = require("../controllers/seatController");

// Public — anyone browsing an event can see the live seat map.
router.get("/:eventId", getSeatMap);

router.post("/:eventId/hold", protect, authorize("customer"), holdSeats);

module.exports = router;
