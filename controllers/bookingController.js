const {
  createBookingService,
  cancelBookingService,
  getMyBookingsService,
} = require("../services/bookingService");

exports.createBooking = async (req, res) => {
  try {
    const { eventId, seatIds } = req.body;

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ success: false, message: "seatIds must be a non-empty array" });
    }

    const booking = await createBookingService({
      userId: req.user._id,
      eventId,
      seatIds,
    });

    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await cancelBookingService(req.params.id, req.user._id);
    res.json({ success: true, booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Fixed from the old version: booking history is scoped to req.user._id
// (set by the protect middleware), never to a client-supplied userId —
// the old code read `userId` from the query string on a route that was
// already auth-protected, which let any logged-in customer view anyone
// else's booking history by guessing an ID.
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await getMyBookingsService(req.user._id);
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
