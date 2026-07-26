const express = require("express");
const router = express.Router();

const {
  renderHome,
  renderLogin,
  renderRegister,
  handleLogout,
  renderSearchResults,
  renderDashboard,
  renderBrowseEvents,
  renderEventDetails,
  renderMyBookings,
  renderMyWaitlist,
  renderBookingConfirmation,
  renderCreateEventForm,
  renderEventStats,
  renderCreateVenueForm,
  renderRegisterOrganizerForm,
} = require("../controllers/viewController");

router.get("/", renderHome);
router.get("/login", renderLogin);
router.get("/register", renderRegister);
router.post("/logout", handleLogout);
router.get("/search", renderSearchResults);

router.get("/dashboard", renderDashboard);
router.get("/events", renderBrowseEvents);
router.get("/events/:id", renderEventDetails);
router.get("/my-bookings", renderMyBookings);
router.get("/my-waitlist", renderMyWaitlist);
router.get("/bookings/:id/confirmation", renderBookingConfirmation);

router.get("/organizer/events/new", renderCreateEventForm);
router.get("/organizer/events/:id/stats", renderEventStats);

router.get("/admin/venues/new", renderCreateVenueForm);
router.get("/admin/register-organizer", renderRegisterOrganizerForm);

module.exports = router;
