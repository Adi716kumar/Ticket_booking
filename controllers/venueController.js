const {
  createVenueService,
  getAllVenuesService,
  getVenueByIdService,
  deleteVenueService,
} = require("../services/venueService");

exports.createVenue = async (req, res) => {
  try {
    const { name, location, totalRows, totalColumns, premiumRows } = req.body;
    const venue = await createVenueService({
      name,
      location,
      totalRows: Number(totalRows),
      totalColumns: Number(totalColumns),
      premiumRows: Number(premiumRows),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, venue });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllVenues = async (req, res) => {
  try {
    const venues = await getAllVenuesService();
    res.json({ success: true, venues });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getVenueById = async (req, res) => {
  try {
    const venue = await getVenueByIdService(req.params.id);
    res.json({ success: true, venue });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

exports.deleteVenue = async (req, res) => {
  try {
    await deleteVenueService(req.params.id);
    res.json({ success: true, message: "Venue deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
