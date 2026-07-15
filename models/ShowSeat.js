const mongoose = require("mongoose");

const showSeatSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },

    status: {
      type: String,
      enum: ["Available", "Held", "Booked"],
      default: "Available",
    },

    category: {
    type: String,
    enum: ["Premium", "Standard"],
    required: true,
},

price: {
    type: Number,
    required: true,
},

    heldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    holdExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ShowSeat", showSeatSchema);