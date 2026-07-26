const {
  createEventService,
  getEventsService,
  getEventByIdService,
  getEventsByOrganizerService,
  getEventStatsService,
} = require("../services/eventService");

exports.createEvent = async (req, res) => {
  try {
    const { title, type, venueId, date, startTime, durationMinutes, pricing } = req.body;

    const event = await createEventService({
      title,
      type,
      venueId,
      organizerId: req.user._id,
      date: new Date(date),
      startTime,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      pricing: {
        Premium: Number(pricing.Premium),
        Standard: Number(pricing.Standard),
      },
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { type, maxPrice, dateFrom, dateTo } = req.query;
    const events = await getEventsService({
      type,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });
    res.json({ success: true, events });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await getEventByIdService(req.params.id);
    res.json({ success: true, event });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.getMyEvents = async (req, res) => {
  try {
    const events = await getEventsByOrganizerService(req.user._id);
    res.json({ success: true, events });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getEventStats = async (req, res) => {
  try {
    // Ownership check: an organizer can only see stats for their own events.
    const event = await getEventByIdService(req.params.id);
    if (String(event.organizer._id) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not your event" });
    }

    const stats = await getEventStatsService(req.params.id);
    res.json({ success: true, event, stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
