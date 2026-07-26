const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    seats: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShowSeat" }],
    bookingReference: { type: String, required: true, unique: true },
    qrCode: { type: String, default: "" }, // data URL
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Confirmed", "Cancelled"],
      default: "Confirmed",
    },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
