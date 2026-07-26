const cron = require("node-cron");
const Event = require("../models/Event");
const ShowSeat = require("../models/ShowSeat");

// How long after an event's end time we wait before purging its seat data —
// gives a buffer for late cancellations/support queries before the bulky
// per-seat documents are removed. Booking records are NEVER touched here;
// they're small (references + amount + reference number) and are kept
// permanently so booking history and organizer revenue stats keep working
// for past events, per the decision to only purge ShowSeat, not Booking.
const CLEANUP_BUFFER_HOURS = 24;

function combineDateAndTime(date, startTime) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

// Runs once an hour — this doesn't need minute-level precision like the
// seat-hold/waitlist schedulers do.
cron.schedule("0 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - CLEANUP_BUFFER_HOURS * 60 * 60 * 1000);

    // Only consider events whose date is old enough that even accounting
    // for startTime + duration, they must have ended before the buffer
    // cutoff. Fetching just candidates by date keeps this query cheap.
    const candidates = await Event.find({
      seatDataPurged: false,
      date: { $lte: new Date() },
    });

    let purgedEventCount = 0;
    let purgedSeatCount = 0;

    for (const event of candidates) {
      const start = combineDateAndTime(event.date, event.startTime);
      const end = new Date(start.getTime() + event.durationMinutes * 60000);

      if (end > cutoff) continue; // not old enough yet

      const result = await ShowSeat.deleteMany({ event: event._id });
      purgedSeatCount += result.deletedCount;

      event.seatDataPurged = true;
      await event.save();
      purgedEventCount += 1;
    }

    if (purgedEventCount > 0) {
      console.log(
        `[eventCleanupScheduler] Purged seat data for ${purgedEventCount} events (${purgedSeatCount} ShowSeat docs). Booking history untouched.`
      );
    }
  } catch (error) {
    console.log("[eventCleanupScheduler] error:", error.message);
  }
});
