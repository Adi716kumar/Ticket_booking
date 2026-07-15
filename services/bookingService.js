const Booking = require("../models/Booking");
const ShowSeat = require("../models/ShowSeat");
const Waitlist = require("../models/Waitlist");
const generateQRCode = require("../utils/generateQRCode");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");

const { v4: uuidv4 } = require("uuid");

exports.createBookingService = async (data) => {

    const {
        userId,
        eventId,
        seatIds,
    } = data;

    const seats = await ShowSeat.find({
        _id: { $in: seatIds },
        heldBy: userId,
        status: "Held",
    });

    if (seats.length !== seatIds.length) {
        throw new Error("Some seats are not held by you.");
    }

    let totalAmount = 0;

    seats.forEach((seat) => {
        totalAmount += seat.price;
    });

    //
    console.log("Seat IDs:", seatIds);

        const result = await ShowSeat.updateMany(
            {
                _id: { $in: seatIds }
            },
            {
                $set: {
                    status: "Booked",
                    holdExpiresAt: null
                }
            }
        );


    //
    console.log(result);

    
    const bookingReference = uuidv4();

const qrCode = await generateQRCode(bookingReference);

const booking = await Booking.create({

    user: userId,

    event: eventId,

    seats: seatIds,

    bookingReference,

    qrCode,

    totalAmount,

});


const user = await User.findById(userId);

try {
    await sendEmail(
        user.email,
        "Ticket Booking Confirmation",
        `
        <h2>Booking Confirmed</h2>
        <p>Booking Reference: ${booking.bookingReference}</p>
        <img src="${booking.qrCode}" width="200"/>
        `
    );
} catch (err) {
    console.log("Email Error:", err.message);
}

    return booking;
};


exports.cancelBookingService = async(id, userId)=>{

    const booking = await Booking.findById({
        _id: id,
        user: userId
    });

    if(!booking){
        throw new Error("Booking not found");
    }

    booking.status = "Cancelled";

    await booking.save();
    

    await ShowSeat.updateMany(
        {
            _id:{
                $in: booking.seats
            }
        },
        {
            $set:{
                status:"Available",
                heldBy: nextUser.user,
                holdExpiresAt: nextUser.offerExpiresAt
            }
        }
    );

    // Waitlist logic starts here
     
    const releasedSeat = await ShowSeat.findById(booking.seats[0]);

    const nextUser = await Waitlist.findOne({
    event: booking.event,
    category: releasedSeat.category,
    status: "Waiting"
}).sort({ createdAt: 1 });

 //testing
 //
 console.log("Next User:", nextUser);
 //

if (nextUser) {

    nextUser.status = "Offered";

    nextUser.offeredSeats = booking.seats;

    nextUser.offerExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
    );

    await nextUser.save();

    // Hold these seats for the waitlisted user
    await ShowSeat.updateMany(
        {
            _id: { $in: booking.seats }
        },
        {
            $set: {
                status: "Held",
                heldBy: null,
                holdExpiresAt: null
            }
        }
    );

}
    

    // Waitlist logic ends here

    return booking;
}

//get booking history
exports.getMyBookingsService = async (userId) => {

    return await Booking.find({
        user: userId
    })
    .populate("event")
    .populate({
        path: "seats",
        populate: {
            path: "seat"
        }
    });

};