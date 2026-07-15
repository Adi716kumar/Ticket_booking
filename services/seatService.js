const ShowSeat = require("../models/ShowSeat");

exports.getSeatMapService = async(eventId)=>{

    return await ShowSeat.find({
        event:eventId
    }).populate("seat");

}


exports.holdSeatsService = async (seatIds, userId) => {

    const expiryTime = new Date(
        Date.now() + 10 * 60 * 1000   //for final change it to +10*60*1000
    );

    const result = await ShowSeat.updateMany(
        {
            _id: { $in: seatIds },
            status: "Available",
        },
        {
            $set: {
                status: "Held",
                heldBy: userId,
                holdExpiresAt: expiryTime,
            },
        }
    );

    if (result.modifiedCount !== seatIds.length) {
        throw new Error("One or more seats are unavailable.");
    }

    return {
        expiryTime,
    };

};