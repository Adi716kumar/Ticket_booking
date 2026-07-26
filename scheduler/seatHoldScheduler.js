const cron = require("node-cron");
const ShowSeat = require("../models/ShowSeat");
const { getIO } = require("../config/socket");

function broadcastSeatUpdate(eventId, seatIds, status) {
  try {
    getIO().to(`event:${eventId}`).emit("seatUpdate", { seatIds, status });
  } catch (err) {
    // Socket may not be initialized yet at boot, or no one's connected — fine.
  }
}

// Runs every minute. Only ever touches holdReason:"customer_checkout" —
// waitlist-offer holds are exclusively the waitlistScheduler's job. This
// separation is what stops the two schedulers from racing over the same
// seat, which is what happened in the previous version when both matched
// on status:"Held" alone.
cron.schedule("* * * * *", async () => {
  try {
    const expired = await ShowSeat.find({
      status: "Held",
      holdReason: "customer_checkout",
      holdExpiresAt: { $lte: new Date() },
    });

    if (expired.length === 0) return;

    const idsByEvent = {};
    for (const seat of expired) {
      const key = String(seat.event);
      idsByEvent[key] = idsByEvent[key] || [];
      idsByEvent[key].push(seat._id);
    }

    await ShowSeat.updateMany(
      { _id: { $in: expired.map((s) => s._id) } },
      { $set: { status: "Available", heldBy: null, holdExpiresAt: null, holdReason: null } }
    );

    for (const [eventId, seatIds] of Object.entries(idsByEvent)) {
      broadcastSeatUpdate(eventId, seatIds, "Available");
    }

    console.log(`[seatHoldScheduler] Released ${expired.length} expired customer holds.`);
  } catch (error) {
    console.log("[seatHoldScheduler] error:", error.message);
  }
});
