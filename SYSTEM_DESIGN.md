# System Design Write-Up

## Seat Hold & TTL Mechanism

Every seat in an event is modeled as a `ShowSeat` document — one per (event, physical seat)
pair — carrying its own `status` (`Available`/`Held`/`Booked`), `heldBy`, `holdExpiresAt`, and a
`holdReason` field.

When a customer selects seats and hits "Hold," the server sets `status: Held`,
`holdExpiresAt: now + SEAT_HOLD_TTL_MINUTES` (configurable, default 10), and
`holdReason: "customer_checkout"`. A `node-cron` job runs every minute, finds every seat whose
`holdExpiresAt` has passed, flips it back to `Available`, and broadcasts the change over
Socket.IO so every browser looking at that seat map updates without a refresh.

The `holdReason` field exists to solve a specific problem: a seat held open for a waitlisted
customer's time-limited offer is, mechanically, identical to a normal checkout hold — same
`status: Held`, same kind of expiry. If a single scheduler condition matched on status alone, it
would end up processing both kinds of holds together, and a second scheduler handling waitlist
logic would race it over the same documents. Splitting the reason into two values and giving
each scheduler its own filter (`holdReason: "customer_checkout"` for the seat-release job,
`holdReason: "waitlist_offer"` for the waitlist-expiry job) removes that overlap by construction
rather than by careful ordering.

## Concurrency Prevention

Two customers must never both succeed in holding or booking the same seat. This is enforced at
two levels:

**Per-document compare-and-swap.** Every status transition uses `findOneAndUpdate` with the
*current* expected status in the filter — e.g. matching `{status: "Available"}` while setting
`{status: "Held"}`. MongoDB only lets one concurrent request match and update a given document;
a second request arriving microseconds later finds `status` already changed and its filter no
longer matches, so it fails cleanly instead of overwriting the first request's hold. This is the
actual mechanism preventing double-booking — not application-level locking, which would be
slower and harder to reason about under real concurrency.

**Cross-document atomicity via transactions.** A single booking touches several `ShowSeat`
documents and creates one `Booking` document. If a customer holds four seats and the third one
has just been taken by someone else, the request must not leave the first two seats stuck in a
`Held` state with no corresponding booking. `mongoose`'s `session.withTransaction(...)` wraps the
whole per-seat loop: throwing an error partway through — because one seat's compare-and-swap
failed — aborts every write the transaction has made so far, including the seats that had
already succeeded in that same call. The customer gets a clean "some seats are no longer
available" error, and every seat they touched reverts to its pre-request state; nothing is left
half-held. The same transaction pattern wraps booking cancellation, since that operation also
spans multiple `ShowSeat` writes plus a `Booking` status flip plus, potentially, a waitlist
reassignment — all of which need to succeed or fail together.

Note that MongoDB transactions require the database to run as a replica set (even a single-node
one for local development) — a plain standalone `mongod` doesn't support them.

## Waitlist Auto-Assignment Flow

Waitlist entries are scoped to an event **and** a seat category (Premium/Standard), and ordered
FIFO by creation time. When a confirmed booking is cancelled, its seats are grouped by category
— a booking can mix Premium and Standard seats, and each category's freed seats need to go to
that category's waitlist, not be lumped together under whichever seat happened to be listed
first. For each category group with released seats, the earliest `Waiting` entry for that
event+category is looked up; if one exists, its `offeredSeats` is set to that exact group of
freed `ShowSeat` IDs, its status flips to `Offered`, an `offerExpiresAt` is set
(`WAITLIST_OFFER_TTL_MINUTES`, default 10), and those seats are re-held with
`holdReason: "waitlist_offer"` so they're now unavailable to anyone else browsing the seat map.
The customer is emailed a link.

## Time-Limited Offer Handling

Accepting an offer is deliberately **all-or-nothing**: the customer books every seat in the
offered group, or none of them. (An earlier version of this logic supported "partial"
acceptance, but its branch for "some seats declined" and its branch for "all seats accepted" set
the exact same final status either way — dead code that never actually behaved differently.
All-or-nothing removes that ambiguity and keeps a category group from fragmenting across
multiple customers.)

If the customer accepts within the window, `acceptOfferService` re-verifies (inside its own
transaction) that the seats are still held for them specifically with `holdReason:
"waitlist_offer"`, flips them to `Booked`, creates the `Booking`, and marks the waitlist entry
`Booked`.

If the window lapses, `waitlistScheduler.js` (running every minute, matching only
`holdReason: "waitlist_offer"` entries whose `offerExpiresAt` has passed) releases those seats,
marks the entry `Expired`, and — critically — passes the **same seat group** to the next
`Waiting` entry in that event+category, restarting the offer window for them. This repeats until
someone accepts in time or the waitlist for that category is exhausted, at which point the seats
simply remain `Available` for ordinary browsing.
