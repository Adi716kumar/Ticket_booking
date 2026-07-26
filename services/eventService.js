const Event = require("../models/Event");
const Seat = require("../models/Seat");
const ShowSeat = require("../models/ShowSeat");
const Venue = require("../models/Venue");

function combineDateAndTime(date, startTime) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

/**
 * Throws if the requested [start, end) window overlaps any other
 * Scheduled event at the same venue. This is the venue-exclusivity rule:
 * a venue can host many different events over time, just never two at once.
 */
async function assertVenueIsFree(venueId, start, end, excludeEventId = null) {
  // Event start/end times aren't stored directly (only date + startTime +
  // durationMinutes), so Mongo can't compute overlap in a query filter.
  // Instead we fetch that day's events at this venue and check overlap in
  // application code — simple and correct, and the per-venue, per-day
  // event count is small enough that this isn't a perf concern.
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const sameDayEvents = await Event.find({
    venue: venueId,
    status: "Scheduled",
    date: { $gte: dayStart, $lte: dayEnd },
    ...(excludeEventId ? { _id: { $ne: excludeEventId } } : {}),
  });

  for (const evt of sameDayEvents) {
    const evtStart = combineDateAndTime(evt.date, evt.startTime);
    const evtEnd = new Date(evtStart.getTime() + evt.durationMinutes * 60000);

    const overlaps = evtStart < end && evtEnd > start;
    if (overlaps) {
      throw new Error(
        `Venue is already booked for "${evt.title}" from ${evtStart.toLocaleString()} to ${evtEnd.toLocaleString()}.`
      );
    }
  }
}

exports.createEventService = async (data) => {
  const { title, type, venueId, organizerId, date, startTime, durationMinutes, pricing } = data;

  const venue = await Venue.findById(venueId);
  if (!venue) throw new Error("Venue not found");

  const start = combineDateAndTime(date, startTime);
  const end = new Date(start.getTime() + (durationMinutes || 180) * 60000);

  if (start < new Date()) {
    throw new Error("Cannot schedule an event in the past.");
  }

  await assertVenueIsFree(venueId, start, end);

  const event = await Event.create({
    title,
    type,
    venue: venueId,
    organizer: organizerId,
    date,
    startTime,
    durationMinutes: durationMinutes || 180,
    pricing,
  });

  // Generate ShowSeat documents for this event from the venue's physical seats.
  const seats = await Seat.find({ venue: venueId });
  const showSeatDocs = seats.map((seat) => ({
    event: event._id,
    seat: seat._id,
    category: seat.category,
    price: pricing[seat.category],
    status: "Available",
  }));
  await ShowSeat.insertMany(showSeatDocs);

  return event;
};

exports.getEventsService = async (filters = {}) => {
  const query = { status: "Scheduled", date: { $gte: new Date() } };
  if (filters.type) query.type = filters.type;
  if (filters.maxPrice) {
    query.$or = [
      { "pricing.Premium": { $lte: filters.maxPrice } },
      { "pricing.Standard": { $lte: filters.maxPrice } },
    ];
  }
  if (filters.dateFrom || filters.dateTo) {
    query.date = {
      ...query.date,
      ...(filters.dateFrom ? { $gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { $lte: filters.dateTo } : {}),
    };
  }

  return Event.find(query).populate("venue").sort({ date: 1 });
};

exports.getEventByIdService = async (eventId) => {
  const event = await Event.findById(eventId).populate("venue").populate("organizer", "name email");
  if (!event) throw new Error("Event not found");
  return event;
};

exports.getEventsByOrganizerService = async (organizerId) => {
  return Event.find({ organizer: organizerId }).populate("venue").sort({ date: -1 });
};

/**
 * Booking summary + revenue for one event — organizer-facing.
 * Only counts Booked seats (not held/available), and only revenue from
 * bookings that are still Confirmed (cancelled bookings already freed
 * their seats back to Available, so they naturally drop out of this count).
 */
exports.getEventStatsService = async (eventId) => {
  const showSeats = await ShowSeat.find({ event: eventId });

  const totalSeats = showSeats.length;
  const bookedSeats = showSeats.filter((s) => s.status === "Booked");
  const heldSeats = showSeats.filter((s) => s.status === "Held");
  const availableSeats = showSeats.filter((s) => s.status === "Available");

  const revenue = bookedSeats.reduce((sum, s) => sum + s.price, 0);

  return {
    totalSeats,
    booked: bookedSeats.length,
    held: heldSeats.length,
    available: availableSeats.length,
    revenue,
  };
};
