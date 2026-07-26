const { getEventsService, getEventByIdService, getEventStatsService, getEventsByOrganizerService } = require("../services/eventService");
const { getSeatMapService } = require("../services/seatService");
const { getMyBookingsService } = require("../services/bookingService");
const { getMyWaitlistService } = require("../services/waitlistService");
const { searchEventsService } = require("../services/searchService");
const { getAllVenuesService } = require("../services/venueService");
const Booking = require("../models/Booking");

function requireLogin(req, res) {
  if (!req.user) {
    res.redirect("/login");
    return false;
  }
  return true;
}

exports.renderHome = async (req, res) => {
  const events = await getEventsService();
  res.render("home", { events });
};

exports.renderLogin = (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("auth/login");
};

exports.renderRegister = (req, res) => {
  if (req.user) return res.redirect("/dashboard");
  res.render("auth/register");
};

exports.handleLogout = (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
};

exports.renderSearchResults = async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.redirect("/");
  const { filters, events } = await searchEventsService(q);
  res.render("searchResults", { query: q, filters, events });
};

// Single /dashboard route that dispatches by role, so the navbar and any
// bookmarked link always lands the user on the right dashboard.
exports.renderDashboard = async (req, res) => {
  if (!requireLogin(req, res)) return;

  if (req.user.role === "admin") {
    const venues = await getAllVenuesService();
    return res.render("admin/dashboard", { venues });
  }

  if (req.user.role === "organizer") {
    const events = await getEventsByOrganizerService(req.user._id);
    return res.render("organizer/dashboard", { events });
  }

  const events = await getEventsService();
  res.render("customer/dashboard", { events });
};

exports.renderBrowseEvents = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const events = await getEventsService();
  res.render("customer/browseEvents", { events });
};

exports.renderEventDetails = async (req, res) => {
  try {
    const event = await getEventByIdService(req.params.id);
    const seats = await getSeatMapService(req.params.id);

    const seatsByRow = {};
    seats.forEach((s) => {
      const row = s.seat.row;
      seatsByRow[row] = seatsByRow[row] || [];
      seatsByRow[row].push(s);
    });
    Object.values(seatsByRow).forEach((rowSeats) => rowSeats.sort((a, b) => a.seat.column - b.seat.column));
    const rowOrder = Object.keys(seatsByRow).sort();

    res.render("customer/eventDetails", { event, seatsByRow, rowOrder });
  } catch (error) {
    res.status(404).send(error.message);
  }
};

exports.renderMyBookings = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const bookings = await getMyBookingsService(req.user._id);
  res.render("customer/myBookings", { bookings });
};

exports.renderMyWaitlist = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const entries = await getMyWaitlistService(req.user._id);
  res.render("customer/myWaitlist", { entries });
};

exports.renderBookingConfirmation = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
    .populate("event")
    .populate({ path: "seats", populate: { path: "seat" } });

  if (!booking) return res.status(404).send("Booking not found");
  res.render("customer/bookingConfirmation", { booking });
};

exports.renderCreateEventForm = async (req, res) => {
  if (!requireLogin(req, res)) return;
  if (req.user.role !== "organizer") return res.status(403).send("Organizer access only");
  const venues = await getAllVenuesService();
  res.render("organizer/createEvent", { venues });
};

exports.renderEventStats = async (req, res) => {
  if (!requireLogin(req, res)) return;
  const event = await getEventByIdService(req.params.id);

  if (String(event.organizer._id) !== String(req.user._id) && req.user.role !== "admin") {
    return res.status(403).send("Not your event");
  }

  const stats = await getEventStatsService(req.params.id);
  res.render("organizer/eventStats", { event, stats });
};

exports.renderCreateVenueForm = (req, res) => {
  if (!requireLogin(req, res)) return;
  if (req.user.role !== "admin") return res.status(403).send("Admin access only");
  res.render("admin/createVenue");
};

exports.renderRegisterOrganizerForm = (req, res) => {
  if (!requireLogin(req, res)) return;
  if (req.user.role !== "admin") return res.status(403).send("Admin access only");
  res.render("admin/registerOrganizer");
};
