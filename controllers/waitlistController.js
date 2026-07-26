const {
  joinWaitlistService,
  acceptOfferService,
  getMyWaitlistService,
} = require("../services/waitlistService");

exports.joinWaitlist = async (req, res) => {
  try {
    const { eventId, category } = req.body;
    const entry = await joinWaitlistService({ userId: req.user._id, eventId, category });
    res.status(201).json({ success: true, message: "Added to waitlist.", entry });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.acceptOffer = async (req, res) => {
  try {
    const booking = await acceptOfferService({
      waitlistId: req.params.id,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, booking });
  } catch (error) {
    res.status(409).json({ success: false, message: error.message });
  }
};

exports.getMyWaitlist = async (req, res) => {
  try {
    const entries = await getMyWaitlistService(req.user._id);
    res.json({ success: true, entries });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
