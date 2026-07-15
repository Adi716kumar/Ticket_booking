const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },

        location: {
            type: String,
            required: true,
        },

        totalRows: {
            type: Number,
            required: true,
        },

        totalColumns: {
            type: Number,
            required: true,
        },
        premiumRows: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Venue", venueSchema);