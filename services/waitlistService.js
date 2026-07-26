const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const Waitlist = require("../models/Waitlist");
const ShowSeat = require("../models/ShowSeat");
const Booking = require("../models/Booking");
const generateQRCode = require("../utils/generateQRCode");
const sendEmail = require("../utils/sendEmail");
const User = require("../models/User");
const { getIO } = require("../config/socket");

function broadcastSeatUpdate(eventId, seatIds, status) {
  try {
    getIO().to(`event:${eventId}`).emit("seatUpdate", { seatIds, status });
  } catch (err) {
    console.log("Socket broadcast skipped:", err.message);
  }
}

exports.joinWaitlistService = async ({ userId, eventId, category }) => {
  const existing = await Waitlist.findOne({
    user: userId,
    event: eventId,
    category,
    status: { $in: ["Waiting", "Offered"] },
  });

  if (existing) {
    throw new Error("You're already on the waitlist for this event/category.");
  }

  return Waitlist.create({ user: userId, event: eventId, category });
};

/**
 * Accepting an offer is all-or-nothing: the customer either books every
 * seat that was offered to them, or lets the offer expire (in which case
 * the scheduler passes the full offer to the next person in line).
 *
 * The previous version supported "partial" acceptance, but its branching
 * logic set the waitlist entry's status to "Booked" on both the partial
 * and full paths anyway — dead code that never did anything different.
 * All-or-nothing is simpler to reason about and to explain in an
 * interview, and avoids fragmenting an offered seat group.
 */
exports.acceptOfferService = async ({ waitlistId, userId }) => {
  const session = await mongoose.startSession();
  let booking;
  let eventId;
  let seatIds;

  try {
    await session.withTransaction(async () => {
      const waitlistEntry = await Waitlist.findOne({
        _id: waitlistId,
        user: userId,
        status: "Offered",
      }).session(session);

      if (!waitlistEntry) {
        throw new Error("No active offer found for you.");
      }
      if (waitlistEntry.offerExpiresAt < new Date()) {
        throw new Error("This offer has expired.");
      }

      seatIds = waitlistEntry.offeredSeats;
      eventId = waitlistEntry.event;

      const seats = await ShowSeat.find({
        _id: { $in: seatIds },
        heldBy: userId,
        status: "Held",
        holdReason: "waitlist_offer",
      }).session(session);

      if (seats.length !== seatIds.length) {
        throw new Error("Offer is no longer valid — the seats may have been reassigned.");
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);

      await ShowSeat.updateMany(
        { _id: { $in: seatIds } },
        { $set: { status: "Booked", heldBy: null, holdExpiresAt: null, holdReason: null } },
        { session }
      );

      const [created] = await Booking.create(
        [
          {
            user: userId,
            event: eventId,
            seats: seatIds,
            bookingReference: uuidv4(),
            totalAmount,
          },
        ],
        { session }
      );

      waitlistEntry.status = "Booked";
      await waitlistEntry.save({ session });

      booking = created;
    });
  } finally {
    await session.endSession();
  }

  broadcastSeatUpdate(eventId, seatIds, "Booked");

  try {
    const qrCode = await generateQRCode(booking.bookingReference);
    booking.qrCode = qrCode;
    await booking.save();

    const user = await User.findById(userId);
    await sendEmail(
      user.email,
      "Your Booking Confirmation",
      `<h2>Booking Confirmed</h2>
       <p>Booking Reference: ${booking.bookingReference}</p>
       <p>Total: ₹${booking.totalAmount}</p>
       <img src="${qrCode}" width="200" alt="QR ticket" />`
    );
  } catch (err) {
    console.log("QR/email step failed (booking still stands):", err.message);
  }

  return booking;
};

exports.getMyWaitlistService = async (userId) => {
  return Waitlist.find({ user: userId })
    .populate("event")
    .populate({ path: "offeredSeats", populate: { path: "seat" } })
    .sort({ createdAt: -1 });
};
