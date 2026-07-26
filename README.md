# CineTicket — Movie & Concert Ticket Booking System

A ticket booking platform with a visual seat map, TTL-based seat holds, automatic waitlist
reassignment, QR-code email tickets, and natural-language event search.

## Tech Stack

- **Backend**: Node.js, Express 4
- **Frontend**: EJS (server-rendered) + vanilla JS + Socket.IO client
- **Database**: MongoDB / Mongoose
- **Auth**: JWT (httpOnly cookie)
- **Real-time**: Socket.IO
- **Scheduling**: node-cron
- **Email**: Nodemailer (any SMTP provider)
- **QR codes**: `qrcode`
- **AI search**: Anthropic API with a rule-based fallback

## Why MongoDB Needs to Run as a Replica Set

**This is the single most important setup step.** Seat holds and bookings use MongoDB
multi-document transactions (`session.withTransaction`) to make holding several seats — or
cancelling a booking and reassigning it to a waitlisted user — an all-or-nothing operation.
**MongoDB transactions are only supported on a replica set**, not a standalone `mongod`. A
single-node replica set is enough for local development.

### Local setup (single-node replica set)

```bash
# Start mongod with replication enabled
mongod --replSet rs0 --dbpath /path/to/your/data --port 27017

# In a separate terminal, initiate the replica set (one-time)
mongosh --eval "rs.initiate()"
```

Then point `MONGO_URI` at it as normal:
```
MONGO_URI=mongodb://127.0.0.1:27017/ticket_booking?replicaSet=rs0
```

### Or use MongoDB Atlas (free tier)

Atlas clusters are replica sets by default — no extra config needed. Just use the connection
string Atlas gives you as `MONGO_URI`.

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, SMTP_*, etc.
npm run dev             # nodemon, or `npm start` for plain node
```

The server listens on `PORT` (default 5000). Visit `http://localhost:5000`.

### Creating your first admin

There's no public admin signup (by design — see Roles below). Register a normal customer
account first, then manually flip their role in the database once:

```js
// in mongosh, connected to your database
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

From there, the admin account can register organizers through the app itself.

## Roles

| Role | How the account is created | Can do |
|---|---|---|
| **customer** | Public `/register` | Browse events, hold/book seats, cancel, join waitlist, view history |
| **organizer** | **Admin only**, via `/admin/register-organizer` — no public signup | Create events at a venue, view per-event stats/revenue |
| **admin** | Manually promoted (see above) | Create/delete venues, register organizers |

## API Overview

All endpoints are under `/api`. Auth is a JWT in an httpOnly cookie (set on login/register) or
a `Bearer` token in `Authorization`.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a **customer** account |
| POST | `/api/auth/register-organizer` | Admin | Create an **organizer** account |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | — | Logout |
| GET | `/api/auth/me` | Any | Current user |
| POST | `/api/venues` | Admin | Create venue (generates its physical seats) |
| GET | `/api/venues` | Admin | List venues + currently-running event |
| DELETE | `/api/venues/:id` | Admin | Delete (blocked if it has an upcoming event) |
| POST | `/api/events` | Organizer | Create event (blocked on venue time-overlap) |
| GET | `/api/events` | Public | Browse/filter events |
| GET | `/api/events/mine` | Organizer | Their own events |
| GET | `/api/events/:id/stats` | Organizer (owner) / Admin | Booked/held/available + revenue |
| GET | `/api/seats/:eventId` | Public | Live seat map |
| POST | `/api/seats/:eventId/hold` | Customer | Hold up to 10 seats (transactional) |
| POST | `/api/bookings` | Customer | Confirm booking from held seats (transactional) |
| GET | `/api/bookings/my` | Customer | Booking history |
| POST | `/api/bookings/:id/cancel` | Customer | Cancel (idempotent, triggers waitlist offer) |
| POST | `/api/waitlist` | Customer | Join waitlist for event+category |
| POST | `/api/waitlist/:id/accept` | Customer | Accept a time-limited offer (all-or-nothing) |
| GET | `/api/waitlist/my` | Customer | Waitlist status |
| GET | `/api/search?q=...` | Public | Natural-language event search |

## Database Schema (Mongoose models)

- **User** — `name, email, password (bcrypt hash), role`. `role` is immutable after creation.
- **Venue** — `name, location, totalRows, totalColumns, premiumRows, createdBy`.
- **Seat** — one per physical seat in a venue (`venue, row, column, seatNumber, category`).
  Generated once when the venue is created; reused across every event held there.
- **Event** — `title, type, venue, organizer, date, startTime, durationMinutes, pricing
  {Premium, Standard}, status, seatDataPurged`.
- **ShowSeat** — one per (event, seat) pair; this is what actually gets held/booked.
  `status: Available|Held|Booked`, `heldBy`, `holdExpiresAt`, and **`holdReason:
  customer_checkout|waitlist_offer`** (see below for why this field exists).
- **Booking** — `user, event, seats[], bookingReference, qrCode, totalAmount, status,
  cancelledAt`. Kept permanently, never purged.
- **Waitlist** — `user, event, category, offeredSeats[], status, offerExpiresAt`.

## Seat Hold, TTL, and Concurrency — How It Actually Works

**The core interview-relevant design decision in this project is the split between per-document
atomicity and cross-document atomicity, and why both are needed.**

1. **Per-seat atomicity**: every hold/book/cancel update on a `ShowSeat` uses
   `findOneAndUpdate` with a status condition in the filter (e.g. `{status: "Available"}` →
   `{status: "Held"}`). MongoDB guarantees only one concurrent request can match and update a
   given document — this is what actually prevents two customers from grabbing the same seat.
   It's a compare-and-swap, not a read-then-write.

2. **Cross-document atomicity (the transaction)**: a booking touches *multiple* seats and
   *also* creates a `Booking` document. If seat 3 of 4 turns out to be taken between the
   client's click and the server's loop, something has to undo seats 1 and 2 that already
   succeeded — otherwise they're stuck "Held" by a user who didn't get a confirmed booking.
   `session.withTransaction(...)` wraps the whole per-seat loop: throwing partway through
   aborts everything the transaction touched so far. This is the actual fix for a bug found in
   an earlier version of this codebase, where a partial hold failure left orphaned held seats
   until the next TTL sweep.

3. **TTL and release**: a held seat gets `holdExpiresAt = now + SEAT_HOLD_TTL_MINUTES`. A
   `node-cron` job (`seatHoldScheduler.js`) runs every minute and releases anything past its
   expiry back to `Available`, broadcasting the change over Socket.IO.

4. **Why `holdReason` exists**: a seat held for a normal customer checkout and a seat held
   open for a waitlisted user's time-limited offer both look identical if you only look at
   `status: "Held"`. An earlier version of this project had exactly one scheduler condition
   (`status:"Held" AND holdExpiresAt <= now`) driving *both* the seat-release job and the
   waitlist-expiry job — so they'd both match and act on the same waitlist-offer seats in the
   same minute. Adding `holdReason: "customer_checkout" | "waitlist_offer"` and having each
   scheduler filter on its own reason removes the overlap entirely.

## Waitlist Auto-Assignment and Time-Limited Offers

1. Customer joins a waitlist for an event **+ category** (Premium/Standard) when that category
   is sold out. Waitlist entries are ordered FIFO by `createdAt`.
2. When a booking is cancelled, its seats are grouped by category (a booking can mix Premium
   and Standard seats). For **each category group**, the next `Waiting` entry in that category
   gets the seats **held** (`holdReason: "waitlist_offer"`) and their entry flips to `Offered`
   with an `offerExpiresAt`. They're emailed a link.
3. The customer must accept **all** offered seats to book, or let the offer expire —
   acceptance is all-or-nothing, not partial, which keeps a category group from getting
   fragmented across multiple people.
4. If the offer expires, `waitlistScheduler.js` (running every minute) releases those seats,
   marks the entry `Expired`, and passes the **same seat group** to the next person in line —
   repeating until someone accepts or the waitlist empties.

## Venue Exclusivity

An event's occupied window is `[date+startTime, date+startTime+durationMinutes)`. Before
creating an event, `assertVenueIsFree()` checks every other `Scheduled` event at that venue on
the same calendar day for a time overlap and rejects the request if one exists — the same venue
can host many different shows over time, just never two at once.

## Data Lifecycle / Cleanup

Given limited DB space, `eventCleanupScheduler.js` runs hourly and, for any event whose end
time (start + duration) is more than 24 hours in the past, deletes its `ShowSeat` documents
(the bulky per-seat-per-event records) and marks `seatDataPurged: true`. **`Booking` documents
are never deleted** — they're small (references + amount + reference number), and deleting them
would break booking history and organizer revenue reporting for past events.

## Natural-Language Search

`GET /api/search?q=...` parses free text into `{type, maxPrice, dateFrom, dateTo}` filters. If
`ANTHROPIC_API_KEY` is set, it calls the Anthropic API for genuine language understanding; if
the key is missing or the call fails for any reason, it falls back to a rule-based keyword
parser (handles movie/concert, "under ₹X", today/tomorrow/weekend) so search never breaks
outright.

## Known Gaps / Possible Extensions

- No payment step (deliberate — direct hold-to-book flow).
- Venue seat categories are row-based (front N rows = Premium) rather than per-seat, which
  keeps venue setup simple but wouldn't model an irregular real-world layout (e.g. a curved
  balcony section).
- Waitlist entries don't track a specific seat *count* the customer wants — a cancellation
  offers the entire freed category group to the next person in line as one bundle.
