const { createEventService, getEventSummaryService } = require("../services/eventService");

exports.createEvent = async (req, res) => {
    try {

        req.body.organizer = req.user._id;

        await createEventService(req.body);

        res.redirect("/organizer");

    } catch (error) {

        res.send(error.message);

    }
};

exports.getEventSummary = async (req, res) => {

    try {

        const summary = await getEventSummaryService(req.params.eventId);

        res.json({
            success: true,
            summary
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });

    }

};