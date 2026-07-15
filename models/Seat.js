const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
    venue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Venue",
        required: true,
    },

    row: {
        type: String,
        required: true,
    },

    column: {
        type: Number,
        required: true,
    },

    seatNumber: {
        type: String,
        required: true,
    },

    category: {
        type: String,
        enum: ["Premium", "Standard"],
        required: true,
    },
});

module.exports = mongoose.model("Seat", seatSchema);