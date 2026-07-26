const cron = require("node-cron");
const mongoose = require("mongoose");
const Waitlist = require("../models/Waitlist");
const ShowSeat = require("../models/ShowSeat");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { getIO } = require("../config/socket");

const WAITLIST_OFFER_TTL_MINUTES = Number(process.env.WAITLIST_OFFER_TTL_MINUTES) || 10;

function broadcastSeatUpdate(eventId, seatIds, status) {
  try {
    getIO().to(`event:${eventId}`).emit("seatUpdate", { seatIds, status });
  } catch (err) {
    // fine if socket isn't up yet
  }
}

// Runs every minute. Only ever touches holdReason:"waitlist_offer" — see
// seatHoldScheduler.js for why that separation matters.
cron.schedule("* * * * *", async () => {
  try {
    const expiredOffers = await Waitlist.find({
      status: "Offered",
      offerExpiresAt: { $lte: new Date() },
    });

    for (const offer of expiredOffers) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Release this expired offer's seats.
          await ShowSeat.updateMany(
            { _id: { $in: offer.offeredSeats }, holdReason: "waitlist_offer" },
            { $set: { status: "Available", heldBy: null, holdExpiresAt: null, holdReason: null } },
            { session }
          );

          offer.status = "Expired";
          await offer.save({ session });

          // Pass the same seat group to the next person waiting in this
          // event+category, FIFO.
          const nextInLine = await Waitlist.findOne({
            event: offer.event,
            category: offer.category,
            status: "Waiting",
          })
            .sort({ createdAt: 1 })
            .session(session);

          if (nextInLine) {
            const newExpiry = new Date(Date.now() + WAITLIST_OFFER_TTL_MINUTES * 60000);

            nextInLine.status = "Offered";
            nextInLine.offeredSeats = offer.offeredSeats;
            nextInLine.offerExpiresAt = newExpiry;
            await nextInLine.save({ session });

            await ShowSeat.updateMany(
              { _id: { $in: offer.offeredSeats } },
              {
                $set: {
                  status: "Held",
                  heldBy: nextInLine.user,
                  holdExpiresAt: newExpiry,
                  holdReason: "waitlist_offer",
                },
              },
              { session }
            );
          }
        });
      } finally {
        await session.endSession();
      }

      broadcastSeatUpdate(offer.event, offer.offeredSeats, "Available");

      // Best-effort notifications, outside the transaction.
      try {
        const expiredUser = await User.findById(offer.user);
        if (expiredUser) {
          await sendEmail(
            expiredUser.email,
            "Your waitlist offer expired",
            `<p>Your time-limited offer expired. You've been moved back to waiting
             status if you'd like to remain on the waitlist.</p>`
          );
        }
      } catch (err) {
        console.log("[waitlistScheduler] expiry notification failed:", err.message);
      }
    }

    if (expiredOffers.length > 0) {
      console.log(`[waitlistScheduler] Processed ${expiredOffers.length} expired offers.`);
    }
  } catch (error) {
    console.log("[waitlistScheduler] error:", error.message);
  }
});
