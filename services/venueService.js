const Venue = require("../models/Venue");
const Seat = require("../models/Seat");

exports.createVenueService = async (data) => {


    const existingVenue = await Venue.findOne({ name: data.name });

if (existingVenue) {
    throw new Error("Venue already exists");
}
    const venue = await Venue.create(data);

    const seats = [];

    for (let i = 0; i < venue.totalRows; i++) {

        const rowLetter = String.fromCharCode(65 + i);

        for (let j = 1; j <= venue.totalColumns; j++) {

            seats.push({

                venue: venue._id,

                row: rowLetter,

                column: j,

                seatNumber: `${rowLetter}${j}`,

                category:
                    i < venue.premiumRows
                        ? "Premium"
                        : "Standard"

            });

        }

    }

    await Seat.insertMany(seats);

    return venue;

};

exports.getAllVenuesService = async () => {

    return await Venue.find();

};