const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    location: { type: String, required: true, trim: true },
    totalRows: { type: Number, required: true, min: 1 },
    totalColumns: { type: Number, required: true, min: 1 },
    // Rows 1..premiumRows are Premium, the rest are Standard.
    // Kept simple deliberately — a real system might store a per-seat
    // category map, but a row-based split is enough for the spec and
    // easy to explain in an interview.
    premiumRows: { type: Number, required: true, min: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

venueSchema.pre("validate", function (next) {
  if (this.premiumRows > this.totalRows) {
    return next(new Error("premiumRows cannot exceed totalRows"));
  }
  next();
});

module.exports = mongoose.model("Venue", venueSchema);
