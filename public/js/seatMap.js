console.log("seatMap.js loaded");

let selectedSeats = [];
let heldSeats = [];

// Seat Selection
const buttons = document.querySelectorAll(".seat-btn");

buttons.forEach(btn => {

    btn.addEventListener("click", () => {

        const id = btn.dataset.id;

        if (selectedSeats.includes(id)) {

            selectedSeats = selectedSeats.filter(s => s !== id);

            btn.classList.remove("btn-primary");
            btn.classList.add("btn-success");

        } else {

            selectedSeats.push(id);

            btn.classList.remove("btn-success");
            btn.classList.add("btn-primary");

        }

        console.log(selectedSeats);

    });

});

// Hold Seats
document
.getElementById("holdBtn")
.addEventListener("click", () => {

    fetch("/api/seats/hold", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            seatIds: selectedSeats
        })

    })
    .then(res => res.json())
    .then(data => {

    if(data.success){

        alert("Seats held successfully.");
        heldSeats = [...selectedSeats];

        buttons.forEach(btn => {

            if(selectedSeats.includes(btn.dataset.id)){

                btn.classList.remove("btn-primary");
                btn.classList.add("btn-warning");

                btn.disabled = true;

            }

        });
        selectedSeats = [];

    }
    else{

        alert(data.message);

    }

});
});

// Book Seats
const bookBtn = document.getElementById("bookBtn");

bookBtn.addEventListener("click", () => {

    if (heldSeats.length === 0) {
        alert("Please hold seats before booking.");
        return;
    }

    bookBtn.disabled = true;
    bookBtn.innerText = "Booking...";

    fetch("/api/bookings", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            eventId: EVENT_ID,

            seatIds: heldSeats

        })

    })
    .then(res => res.json())
    .then(data => {

        if (data.success) {

            alert("Booking Successful!");

            buttons.forEach(btn => {

                if (heldSeats.includes(btn.dataset.id)) {

                    btn.classList.remove("btn-warning");
                    btn.classList.add("btn-danger");
                    btn.disabled = true;

                }

            });

            heldSeats = [];

            // Reset button for next booking
            bookBtn.disabled = false;
            bookBtn.innerText = "Book Selected Seats";

        } else {

            alert(data.message);

            bookBtn.disabled = false;
            bookBtn.innerText = "Book Selected Seats";

        }

    })
    .catch(err => {

        console.error(err);

        bookBtn.disabled = false;
        bookBtn.innerText = "Book Selected Seats";

        alert("Booking Failed");

    });

});

// Premium Waitlist
const premiumBtn = document.getElementById("premiumWaitlistBtn");

if (premiumBtn) {

    premiumBtn.addEventListener("click", () => {

        fetch("/api/waitlist", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                event: EVENT_ID,

                category: "Premium"

            })

        })
        .then(res => res.json())
        .then(data => {

            alert(data.message);

        });

    });

}

// Standard Waitlist
const standardBtn = document.getElementById("standardWaitlistBtn");

if (standardBtn) {

    standardBtn.addEventListener("click", () => {

        fetch("/api/waitlist", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                event: EVENT_ID,

                category: "Standard"

            })

        })
        .then(res => res.json())
        .then(data => {

            alert(data.message);

        });

    });

}