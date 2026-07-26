const mongoose = require("mongoose");

const waitlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    category: { type: String, enum: ["Premium", "Standard"], required: true },
    offeredSeats: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowSeat" }],
    status: {
      type: String,
      enum: ["Waiting", "Offered", "Booked", "Expired", "Cancelled"],
      default: "Waiting",
    },
    offerExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// FIFO ordering per event+category is core to the "next in line" logic.
waitlistSchema.index({ event: 1, category: 1, status: 1, createdAt: 1 });

module.exports = mongoose.model("Waitlist", waitlistSchema);
