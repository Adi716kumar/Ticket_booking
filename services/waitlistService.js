const Waitlist = require("../models/Waitlist");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");
const { v4: uuidv4 } = require("uuid");

exports.joinWaitlistService = async(data)=>{

    const existing = await Waitlist.findOne({
    user: data.user,
    event: data.event,
    category: data.category,
    status: {
        $in: ["Waiting", "Offered"]
    }
});

if(existing){
    throw new Error("Already in waitlist.");
}

    return await Waitlist.create(data);

}



exports.acceptOfferService = async(data)=>{

    const { waitlistId, seatIds } = data;

    const waitlist = await Waitlist.findById(waitlistId);

    if(!waitlist){
        throw new Error("Offer not found");
    }

    if(waitlist.offerExpiresAt < new Date()){
        throw new Error("Offer expired");
    }

    const offeredSeatIds =
        waitlist.offeredSeats.map(id => id.toString());

    for(const seatId of seatIds){

        if(!offeredSeatIds.includes(seatId)){
            throw new Error("Invalid seat selected.");
        }

    }

    const selectedSeats = await ShowSeat.find({

    _id: { $in: seatIds },

    heldBy: waitlist.user,

    status: "Held"

});

if (selectedSeats.length !== seatIds.length) {

    throw new Error(
        "Offer expired or seats are no longer available."
    );

}

let totalAmount = 0;

selectedSeats.forEach((seat) => {
    totalAmount += seat.price;
});


await ShowSeat.updateMany(
    {
        _id: { $in: seatIds }
    },
    {
        $set: {
            status: "Booked",
            heldBy: null,
            holdExpiresAt: null
        }
    }
);


const booking = await Booking.create({

    user: waitlist.user,

    event: waitlist.event,

    seats: seatIds,

    bookingReference: uuidv4(),

    totalAmount

});

const remainingSeats = waitlist.offeredSeats.filter(
    seat =>
        !seatIds.includes(seat.toString())
);

if (remainingSeats.length === 0) {

    waitlist.status = "Booked";

} else {

    waitlist.status = "Booked";

}

await waitlist.save();


if (remainingSeats.length > 0) {

    const nextUser = await Waitlist.findOne({

        event: waitlist.event,

        category: waitlist.category,

        status: "Waiting"

    }).sort({ createdAt: 1 });

    if (nextUser) {

        nextUser.status = "Offered";

        nextUser.offeredSeats = remainingSeats;

        nextUser.offerExpiresAt =
            new Date(Date.now() + 10 * 60 * 1000);

        await nextUser.save();

    }

}

return booking;

}

exports.getMyWaitlistService = async (userId) => {

    return await Waitlist.find({
        user: userId
    })
    .populate("event")
    .populate({
        path: "offeredSeats",
        populate: {
            path: "seat"
        }
    });

};
