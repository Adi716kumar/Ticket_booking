const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Movie", "Concert"], required: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: "Venue", required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // "19:30"
    // Needed to compute an end time for the venue overlap check — without
    // this, "no double-booking a venue" has nothing to compare against.
    durationMinutes: { type: Number, required: true, default: 180, min: 30 },
    pricing: {
      Premium: { type: Number, required: true, min: 0 },
      Standard: { type: Number, required: true, min: 0 },
    },
    status: {
      type: String,
      enum: ["Scheduled", "Cancelled", "Completed"],
      default: "Scheduled",
    },
    // Separate from `status` on purpose — an event's lifecycle status
    // (scheduled/cancelled/completed) and whether its bulky seat data has
    // been purged are independent facts, and conflating them would make
    // "was this event cancelled?" and "has its data been cleaned up?"
    // impossible to tell apart.
    seatDataPurged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1, type: 1 });

module.exports = mongoose.model("Event", eventSchema);
