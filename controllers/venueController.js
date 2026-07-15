const { createVenueService, venueService } = require("../services/venueService");

exports.createVenue = async (req, res) => {
  try {
    const venue = await createVenueService(req.body);

    res.redirect("/admin");

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


exports.createEventPage = async (req, res) => {

    const venues = await venueService.getAllVenuesService();

    res.render("organizer/createEvent", {
        venues
    });

};