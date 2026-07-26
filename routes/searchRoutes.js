const express = require("express");
const router = express.Router();
const { searchEvents } = require("../controllers/searchController");

router.get("/", searchEvents);

module.exports = router;
