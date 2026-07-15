const authService = require("../services/authService");
const eventService = require("../services/eventService");
const Event = require("../models/Event");
const bookingService = require("../services/bookingService");
const venueService = require("../services/venueService");
const waitlistService = require("../services/waitlistService");

exports.register = async (req, res) => {
    try {

        await authService.registerUser(req.body);

        res.redirect("/login");

    } catch (error) {

        res.send(error.message);

    }
};


exports.login = async (req, res) => {

    try {

        const data = await authService.loginUser(req.body);

        res.cookie("token", data.token, {

            httpOnly: true,

            maxAge: 7 * 24 * 60 * 60 * 1000

        });

        if (data.user.role === "customer") {

            return res.redirect("/dashboard");

        }

        if (data.user.role === "organizer") {

            return res.redirect("/organizer");

        }

        return res.redirect("/admin");

    }
    catch (error) {

        res.send(error.message);

    }

};

exports.events = async (req, res) => {

    try {

        const events =
            await eventService.getAllEventsService();

        res.render("customer/events", {

            events

        });

    } catch (error) {

        res.send(error.message);

    }

};

exports.seatMap = async(req,res)=>{

    const event =
    await Event.findById(req.params.id);

    const seats =
    await eventService.getSeatMapService(
        req.params.id
    );

    res.render("customer/seatMap",{

        event,

        seats

    });

};

exports.seatMap = async (req, res) => {

    const event =
        await Event.findById(req.params.id);

    const seats =
        await eventService.getSeatMapService(
            req.params.id
        );

    const premiumAvailable = seats.filter(
        seat =>
            seat.category === "Premium" &&
            seat.status === "Available"
    ).length;

    const standardAvailable = seats.filter(
        seat =>
            seat.category === "Standard" &&
            seat.status === "Available"
    ).length;

    res.render("customer/seatMap", {

        event,

        seats,

        premiumAvailable,

        standardAvailable

    });

};

exports.myBookings = async (req, res) => {

    try {

        const userId = req.user._id;

        const bookings =
        await bookingService.getMyBookingsService(
            userId
        );

        res.render(
            "customer/booking",
            {
                bookings
            }
        );

    } catch (error) {

        res.send(error.message);

    }

};

exports.cancelBooking = async(req,res)=>{

    try{

        await bookingService.cancelBookingService(
            req.params.id
        );

        res.redirect("/bookings");

    }
    catch(error){

        res.send(error.message);

    }

}


exports.viewVenues = async (req, res) => {

    try {

        const venues = await venueService.getAllVenuesService();

        res.render("admin/viewVenues", {
            venues
        });

    } catch (error) {

        res.send(error.message);

    }

};

exports.createEventPage = async (req, res) => {

    const venues = await venueService.getAllVenuesService();

    res.render("organizer/createEvent", {
        venues
    });

};

exports.myEvents = async (req, res) => {

    try {

        const events = await eventService.getOrganizerEventsService(
            req.user._id
        );

        res.render("organizer/myEvents", {
            events
        });

    } catch (error) {

        res.send(error.message);

    }

};

exports.myWaitlist = async (req, res) => {

    try {

        const waitlists =
            await waitlistService.getMyWaitlistService(
                req.user._id
            );

        res.render("customer/waitlist", {

            waitlists

        });

    } catch (error) {

        res.send(error.message);

    }

};