const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const { createBooking, cancelBooking, getMyBookings } = require("../controllers/bookingController");

router.post("/", protect, authorize("customer"), createBooking);
router.get("/my", protect, authorize("customer"), getMyBookings);
router.post("/:id/cancel", protect, authorize("customer"), cancelBooking);

module.exports = router;
