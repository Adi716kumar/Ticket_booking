const express = require("express");

const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const {
    joinWaitlist,
    acceptOffer
} = require("../controllers/waitlistController");

router.post(
    "/",
    protect,
    authorize("customer"),
    joinWaitlist
);

router.post(
    "/accept",
    protect,
    authorize("customer"),
    acceptOffer
);

module.exports = router;