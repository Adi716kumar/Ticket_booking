const mongoose = require("mongoose");

// One document per (event, seat) pair — this is what actually gets
// held/booked, not the physical Seat itself.
const showSeatSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    seat: { type: mongoose.Schema.Types.ObjectId, ref: "Seat", required: true },
    category: { type: String, enum: ["Premium", "Standard"], required: true },
    price: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Available", "Held", "Booked"],
      default: "Available",
    },

    heldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    holdExpiresAt: { type: Date, default: null },

    // Distinguishes a normal customer checkout hold from a seat being
    // held open for a waitlisted user's time-limited offer. The two
    // schedulers (seatHoldScheduler / waitlistScheduler) each only touch
    // their own reason, so they can never race each other over the same
    // seat the way they could when both matched on status alone.
    holdReason: {
      type: String,
      enum: ["customer_checkout", "waitlist_offer", null],
      default: null,
    },
  },
  { timestamps: true }
);

showSeatSchema.index({ event: 1, seat: 1 }, { unique: true });
showSeatSchema.index({ status: 1, holdExpiresAt: 1, holdReason: 1 });

module.exports = mongoose.model("ShowSeat", showSeatSchema);
