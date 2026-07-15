const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize")


const {
    getSeatMap,
    holdSeats,
    bookSeats
} = require("../controllers/seatController");

router.get("/:eventId", getSeatMap);

router.post(
    "/hold",
    protect,
    authorize("customer"),
    holdSeats
);


router.post("/book", bookSeats);

module.exports = router;