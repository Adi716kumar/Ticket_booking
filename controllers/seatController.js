const { getSeatMapService, holdSeatsService } = require("../services/seatService");

exports.getSeatMap = async (req, res) => {
  try {
    const seats = await getSeatMapService(req.params.eventId);
    res.json({ success: true, seats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.holdSeats = async (req, res) => {
  try {
    const { seatIds } = req.body;
    const { eventId } = req.params;

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ success: false, message: "seatIds must be a non-empty array" });
    }
    if (seatIds.length > 10) {
      return res.status(400).json({ success: false, message: "Cannot hold more than 10 seats at once" });
    }

    const data = await holdSeatsService({ eventId, seatIds, userId: req.user._id });
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  }
};
