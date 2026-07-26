const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const Booking = require("../models/Booking");
const ShowSeat = require("../models/ShowSeat");
const Waitlist = require("../models/Waitlist");
const User = require("../models/User");
const generateQRCode = require("../utils/generateQRCode");
const sendEmail = require("../utils/sendEmail");
const { getIO } = require("../config/socket");

const WAITLIST_OFFER_TTL_MINUTES = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 10;

function broadcastSeatUpdate(eventId, seatIds, status) {
  // Best-effort — a socket broadcast failure should never fail a booking.
  try {
    getIO().to(`event:${eventId}`).emit("seatUpdate", { seatIds, status });
  } catch (err) {
    console.log("Socket broadcast skipped:", err.message);
  }
}

exports.createBookingService = async ({ userId, eventId, seatIds }) => {
  const session = await mongoose.startSession();
  let booking;

  try {
    await session.withTransaction(async () => {
      // Re-verify (inside the transaction) that every seat is still held
      // by THIS user — not just "held by someone" — closing the gap where
      // a hold could have expired between the client's hold call and this
      // booking call.
      const seats = await ShowSeat.find({
        _id: { $in: seatIds },
        event: eventId,
        heldBy: userId,
        status: "Held",
      }).session(session);

      if (seats.length !== seatIds.length) {
        throw new Error("Some seats are no longer held by you — your hold may have expired.");
      }

      const totalAmount = seats.reduce((sum, s) => sum + s.price, 0);
      const bookingReference = uuidv4();

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
            bookingReference,
            totalAmount,
          },
        ],
        { session }
      );

      booking = created;
    });
  } finally {
    await session.endSession();
  }

  broadcastSeatUpdate(eventId, seatIds, "Booked");

  // QR generation + email are best-effort side effects, not part of the
  // DB transaction — a flaky SMTP connection should never undo a booking
  // that already succeeded.
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

exports.cancelBookingService = async (bookingId, userId) => {
  const session = await mongoose.startSession();
  let booking;
  let releasedSeats = [];

  try {
    await session.withTransaction(async () => {
      // Atomic compare-and-swap on status:"Confirmed" — this is what makes
      // cancel idempotent. A second cancel call (double-click, retry) finds
      // no matching document the second time and fails cleanly instead of
      // re-releasing seats that may have already been rebooked by someone
      // from the waitlist.
      booking = await Booking.findOneAndUpdate(
        { _id: bookingId, user: userId, status: "Confirmed" },
        { $set: { status: "Cancelled", cancelledAt: new Date() } },
        { session, new: true }
      );

      if (!booking) {
        throw new Error("Booking not found, not yours, or already cancelled.");
      }

      releasedSeats = await ShowSeat.find({ _id: { $in: booking.seats } }).session(session);

      await ShowSeat.updateMany(
        { _id: { $in: booking.seats } },
        { $set: { status: "Available", heldBy: null, holdExpiresAt: null, holdReason: null } },
        { session }
      );

      // Group released seats by category — fixes the old bug where only
      // seats[0]'s category was checked, which could hand a Premium seat
      // to a Standard waitlister on a mixed-category booking.
      const seatIdsByCategory = {};
      for (const seat of releasedSeats) {
        seatIdsByCategory[seat.category] = seatIdsByCategory[seat.category] || [];
        seatIdsByCategory[seat.category].push(seat._id);
      }

      for (const [category, catSeatIds] of Object.entries(seatIdsByCategory)) {
        const nextInLine = await Waitlist.findOne({
          event: booking.event,
          category,
          status: "Waiting",
        })
          .sort({ createdAt: 1 })
          .session(session);

        if (!nextInLine) continue;

        const offerExpiresAt = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60000);

        nextInLine.status = "Offered";
        nextInLine.offeredSeats = catSeatIds;
        nextInLine.offerExpiresAt = offerExpiresAt;
        await nextInLine.save({ session });

        await ShowSeat.updateMany(
          { _id: { $in: catSeatIds } },
          {
            $set: {
              status: "Held",
              heldBy: nextInLine.user,
              holdExpiresAt: offerExpiresAt,
              holdReason: "waitlist_offer",
            },
          },
          { session }
        );

        // Fire-and-forget notification; failure here shouldn't roll back
        // a cancellation that already succeeded.
        User.findById(nextInLine.user)
          .then((user) => {
            if (!user) return;
            return sendEmail(
              user.email,
              "A seat opened up — action needed",
              `<p>A seat you're waitlisted for is now available. You have until
               ${offerExpiresAt.toLocaleString()} to complete your booking.</p>`
            );
          })
          .catch((err) => console.log("Waitlist notification failed:", err.message));
      }
    });
  } finally {
    await session.endSession();
  }

  // NOTE: some of these seats may have been immediately re-held for a
  // waitlist offer above, so "Available" isn't guaranteed true for every
  // seat in this list by the time the client receives it. Treat this as a
  // "something changed, refetch the seat map" signal on the frontend
  // rather than trusting the status literally — the seat map fetch is the
  // source of truth.
  broadcastSeatUpdate(booking.event, booking.seats, "Available");

  return booking;
};

exports.getMyBookingsService = async (userId) => {
  return Booking.find({ user: userId })
    .populate("event")
    .populate({ path: "seats", populate: { path: "seat" } })
    .sort({ createdAt: -1 });
};
