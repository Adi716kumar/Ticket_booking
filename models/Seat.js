const mongoose = require("mongoose");

// A physical seat in a venue. Shared across every event held at that venue.
const seatSchema = new mongoose.Schema({
  venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
  row: { type: String, required: true },
  column: { type: Number, required: true },
  seatNumber: { type: String, required: true }, // e.g. "A1"
  category: { type: String, enum: ["Premium", "Standard"], required: true },
});

seatSchema.index({ venue: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model("Seat", seatSchema);
