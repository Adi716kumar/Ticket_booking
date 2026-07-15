const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

dotenv.config();

connectDB();

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

//schedular
require("./scheduler/seatHoldScheduler");
require("./scheduler/waitlistScheduler");

//middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.json());
app.use(cookieParser());

//routes
const authRoutes = require("./routes/authRoutes");
const venueRoutes = require("./routes/venueRoutes");
const eventRoutes = require("./routes/eventRoutes");
const seatRoutes = require("./routes/seatRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const waitlistRoutes = require("./routes/waitlistRoutes");
const viewRoutes = require("./routes/viewRoutes");



app.use("/", viewRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/seats", seatRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/venues", venueRoutes);


app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});