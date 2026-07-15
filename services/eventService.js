const Event = require("../models/Event");
const Venue = require("../models/Venue");
const Seat = require("../models/Seat");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");

exports.createEventService = async (data) => {

    const venue = await Venue.findById(data.venue);

    if (!venue) {
        throw new Error("Venue not found");
    }

    const event = await Event.create(data);

    const venueSeats = await Seat.find({
        venue: venue._id,
    });

    const showSeats = venueSeats.map((seat) => ({

    event: event._id,

    seat: seat._id,

    category: seat.category,

    price: data.pricing[seat.category]

}));

    await ShowSeat.insertMany(showSeats);

    return event;
};


exports.getEventSummaryService = async (eventId) => {

    const totalSeats = await ShowSeat.countDocuments({
        event: eventId
    });

    const bookedSeats = await ShowSeat.countDocuments({
        event: eventId,
        status: "Booked"
    });

    const availableSeats = await ShowSeat.countDocuments({
        event: eventId,
        status: "Available"
    });

    const bookings = await Booking.find({
        event: eventId,
        status: "Confirmed"
    });

    let revenue = 0;

    bookings.forEach((booking) => {
        revenue += booking.totalAmount;
    });

    return {
        totalSeats,
        bookedSeats,
        availableSeats,
        revenue
    };

};

exports.getAllEventsService = async () => {

    return await Event
        .find()
        .populate("venue")
        .populate("organizer");

}

exports.getSeatMapService = async(eventId)=>{

    return await ShowSeat
        .find({
            event:eventId
        })
        .populate("seat");

}

exports.getOrganizerEventsService = async (organizerId) => {

    return await Event
        .find({ organizer: organizerId })
        .populate("venue");

};