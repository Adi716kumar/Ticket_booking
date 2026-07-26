const Venue = require("../models/Venue");
const Seat = require("../models/Seat");
const Event = require("../models/Event");

const ROW_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

exports.createVenueService = async ({ name, location, totalRows, totalColumns, premiumRows, createdBy }) => {
  const venue = await Venue.create({ name, location, totalRows, totalColumns, premiumRows, createdBy });

  // Generate the physical Seat documents once, up front. These are
  // reused across every event held at this venue — only ShowSeat
  // (the per-event status) gets created/destroyed per event.
  const seatDocs = [];
  for (let r = 0; r < totalRows; r++) {
    const rowLabel = ROW_LETTERS[r] || `R${r + 1}`;
    const category = r < premiumRows ? "Premium" : "Standard";
    for (let c = 1; c <= totalColumns; c++) {
      seatDocs.push({
        venue: venue._id,
        row: rowLabel,
        column: c,
        seatNumber: `${rowLabel}${c}`,
        category,
      });
    }
  }
  await Seat.insertMany(seatDocs);

  return venue;
};

exports.getAllVenuesService = async () => {
  const venues = await Venue.find().sort({ createdAt: -1 }).lean();

  // For each venue, surface the currently-running event (if any) so the
  // admin dashboard can show it without a separate call per venue.
  const now = new Date();
  const venuesWithCurrentEvent = await Promise.all(
    venues.map(async (venue) => {
      const currentEvent = await Event.findOne({
        venue: venue._id,
        status: "Scheduled",
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .lean();
      return { ...venue, currentEvent };
    })
  );

  return venuesWithCurrentEvent;
};

exports.getVenueByIdService = async (venueId) => {
  const venue = await Venue.findById(venueId);
  if (!venue) throw new Error("Venue not found");
  return venue;
};

exports.deleteVenueService = async (venueId) => {
  const activeEvent = await Event.findOne({
    venue: venueId,
    status: "Scheduled",
    date: { $gte: new Date() },
  });

  if (activeEvent) {
    throw new Error("Cannot delete a venue with an upcoming or ongoing event. Cancel the event first.");
  }

  await Seat.deleteMany({ venue: venueId });
  await Venue.findByIdAndDelete(venueId);
};
