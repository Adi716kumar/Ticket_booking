const {
    joinWaitlistService,
    acceptOfferService,
    getMyWaitlistService,
} = require("../services/waitlistService");

exports.joinWaitlist = async (req, res) => {
    try {
        const waitlist = await joinWaitlistService({
             user: req.user._id,
             event: req.body.event,
             category: req.body.category

        });

        res.status(201).json({
            success: true,
            message: "Successfully joined waitlist.",
            waitlist,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

exports.acceptOffer = async (req, res) => {

    try {

        await acceptOfferService(req.body);

        res.redirect("/bookings");

    } catch (error) {

        res.send(error.message);

    }

};


exports.myWaitlist = async (req, res) => {

    try {

        const waitlists =
            await getMyWaitlistService(
                req.user._id
            );

        res.render("customer/waitlist", {

            waitlists

        });

    } catch (error) {

        res.send(error.message);

    }

};