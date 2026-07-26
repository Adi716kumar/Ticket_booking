const mongoose = require("mongoose");
const ShowSeat = require("../models/ShowSeat");

exports.getSeatMapService = async (eventId) => {
  return ShowSeat.find({ event: eventId }).populate("seat").lean();
};

/**
 * Holds a set of seats for a customer's checkout, all-or-nothing.
 *
 * Each seat update is an atomic compare-and-swap on its own
 * (findOneAndUpdate matching status:"Available" — Mongo guarantees only
 * one concurrent request can win that match per document, which is what
 * actually prevents two customers from holding the same seat).
 *
 * The transaction on top of that is what fixes the bug the previous
 * version had: if seat 3 of 4 turns out to be already taken, the
 * transaction aborts and rolls back seats 1 and 2 that had already
 * succeeded in this call — so a failed hold attempt never leaves stray
 * seats locked away from other customers.
 *
 * NOTE: this requires MongoDB running as a replica set (even a single-node
 * one) — transactions aren't supported on a standalone mongod. See README.
 */
exports.holdSeatsService = async ({ eventId, seatIds, userId }) => {
  const ttlMinutes = Number(process.env.SEAT_HOLD_TTL_MINUTES) || 10;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000);

  const uniqueSeatIds = [...new Set(seatIds.map(String))];

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const seatId of uniqueSeatIds) {
        const updated = await ShowSeat.findOneAndUpdate(
          { _id: seatId, event: eventId, status: "Available" },
          {
            $set: {
              status: "Held",
              heldBy: userId,
              holdExpiresAt: expiresAt,
              holdReason: "customer_checkout",
            },
          },
          { session, new: true }
        );

        if (!updated) {
          // Throwing inside withTransaction aborts the whole transaction —
          // every seat updated earlier in this loop reverts automatically.
          throw new Error("One or more selected seats are no longer available.");
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return { expiresAt, seatIds: uniqueSeatIds };
};
