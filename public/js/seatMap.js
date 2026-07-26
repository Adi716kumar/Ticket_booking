// Expects the page to define: window.EVENT_ID, and to have loaded the
// socket.io client script (served automatically by the socket.io server
// at /socket.io/socket.io.js).

let selectedSeats = [];
let heldSeats = [];

const seatMapEl = document.getElementById("seatMap");

function seatButton(id) {
  return document.querySelector(`.seat-btn[data-id="${id}"]`);
}

function paintSeat(id, status) {
  const btn = seatButton(id);
  if (!btn) return;

  btn.classList.remove("seat-available", "seat-held", "seat-booked", "seat-selected");
  btn.disabled = false;

  if (status === "Available") {
    btn.classList.add("seat-available");
  } else if (status === "Held") {
    btn.classList.add("seat-held");
    btn.disabled = true;
  } else if (status === "Booked") {
    btn.classList.add("seat-booked");
    btn.disabled = true;
  }
}

async function refetchSeatMap() {
  try {
    const res = await fetch(`/api/seats/${window.EVENT_ID}`);
    const data = await res.json();
    if (!data.success) return;

    data.seats.forEach((showSeat) => {
      // Don't clobber a seat the current user has selected-but-not-yet-held
      // locally, or one they're actively holding — only repaint seats
      // whose true server status differs from what we're showing.
      if (selectedSeats.includes(showSeat._id) || heldSeats.includes(showSeat._id)) return;
      paintSeat(showSeat._id, showSeat.status);
    });
  } catch (err) {
    console.log("Seat map refetch failed:", err.message);
  }
}

// --- Socket.IO live updates ---
if (window.io) {
  const socket = window.io();
  socket.emit("joinEvent", window.EVENT_ID);

  // Server broadcasts are a "something changed" signal, not a guaranteed
  // literal per-seat status (see bookingService.js comments) — so we
  // always refetch the real seat map rather than trusting the payload.
  socket.on("seatUpdate", () => {
    refetchSeatMap();
  });
}

// --- Seat selection (not yet held) ---
if (seatMapEl) {
  seatMapEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".seat-btn");
    if (!btn || btn.disabled) return;

    const id = btn.dataset.id;

    if (selectedSeats.includes(id)) {
      selectedSeats = selectedSeats.filter((s) => s !== id);
      btn.classList.remove("seat-selected");
      btn.classList.add("seat-available");
    } else {
      selectedSeats.push(id);
      btn.classList.remove("seat-available");
      btn.classList.add("seat-selected");
    }
  });
}

// --- Hold seats ---
const holdBtn = document.getElementById("holdBtn");
if (holdBtn) {
  holdBtn.addEventListener("click", async () => {
    if (selectedSeats.length === 0) {
      alert("Select at least one seat first.");
      return;
    }

    try {
      const res = await fetch(`/api/seats/${window.EVENT_ID}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatIds: selectedSeats }),
      });
      const data = await res.json();

      if (data.success) {
        heldSeats = [...selectedSeats];
        selectedSeats.forEach((id) => paintSeat(id, "Held"));
        selectedSeats = [];
        document.getElementById("bookBtn")?.removeAttribute("disabled");
      } else {
        alert(data.message);
        refetchSeatMap(); // someone else may have taken a seat we tried to hold
      }
    } catch (err) {
      alert("Hold request failed. Please try again.");
    }
  });
}

// --- Book held seats ---
const bookBtn = document.getElementById("bookBtn");
if (bookBtn) {
  bookBtn.addEventListener("click", async () => {
    if (heldSeats.length === 0) {
      alert("Hold seats before booking.");
      return;
    }

    bookBtn.disabled = true;
    bookBtn.innerText = "Booking...";

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: window.EVENT_ID, seatIds: heldSeats }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = `/bookings/${data.booking._id}/confirmation`;
      } else {
        alert(data.message);
        bookBtn.disabled = false;
        bookBtn.innerText = "Book Selected Seats";
        refetchSeatMap();
      }
    } catch (err) {
      alert("Booking failed. Please try again.");
      bookBtn.disabled = false;
      bookBtn.innerText = "Book Selected Seats";
    }
  });
}

// --- Waitlist join buttons (Premium / Standard) ---
document.querySelectorAll(".waitlist-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: window.EVENT_ID, category: btn.dataset.category }),
      });
      const data = await res.json();
      alert(data.message || (data.success ? "Joined waitlist." : "Could not join waitlist."));
    } catch (err) {
      alert("Something went wrong joining the waitlist.");
    }
  });
});
