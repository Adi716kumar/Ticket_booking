const express = require("express");

const router = express.Router();

const venueController = require("../controllers/venueController");
const viewController = require("../controllers/viewController");
const eventController = require("../controllers/eventController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

router.get("/", (req, res) => {
    res.render("home");
});

router.get("/login", (req, res) => {
    res.render("auth/login");
});

router.get("/register", (req, res) => {
    res.render("auth/register");
});

router.get(
    "/dashboard",
    protect,
    (req, res) => {

        res.render("dashboard");
    }
);

router.get("/events", viewController.events);

router.get(
    "/events/:id",
    viewController.seatMap
);

router.get(
    "/bookings",
    protect,
    authorize("customer"),
    viewController.myBookings
);

router.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

router.get("/admin", protect, authorize("admin"), (req, res) => {
    res.render("admin/dashboard");
});

router.get("/organizer", protect, authorize("organizer"), (req, res) => {
    res.render("organizer/dashboard")
});

router.get(
    "/admin/venues/create",
    protect,
    authorize("admin"),
    (req, res) => {
        res.render("admin/createVenue");
    }
);


router.get(
    "/admin/venues",
    protect,
    authorize("admin"),
    viewController.viewVenues
);

router.get(
    "/organizer/events/create",
    protect,
    authorize("organizer"),
    viewController.createEventPage
);

router.get(
    "/organizer/events",
    protect,
    authorize("organizer"),
    viewController.myEvents
);

router.get(
    "/waitlist",
    protect,
    authorize("customer"),
    viewController.myWaitlist
);

router.post("/login", viewController.login);
router.post("/register", viewController.register);

router.post(
    "/bookings/:id/cancel",
    protect,
    authorize("customer"),
    viewController.cancelBooking
);

router.post(
    "/admin/venues/create",
    protect,
    authorize("admin"),
    venueController.createVenue
);

router.post(
    "/organizer/events/create",
    protect,
    authorize("organizer"),
    eventController.createEvent
);

module.exports = router;