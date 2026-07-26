const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./config/db");
const { initSocket } = require("./config/socket");
const optionalAuth = require("./middleware/optionalAuth");

connectDB();

const app = express();

// Socket.IO needs the raw HTTP server, not the Express app directly —
// this is the piece that was missing entirely in the previous version:
// socket.io was a dependency, config/socket.js existed, but nothing ever
// called http.createServer + initSocket, so no socket connection was ever
// actually possible.
const httpServer = http.createServer(app);
initSocket(httpServer);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", "./views");

app.use(optionalAuth);
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Schedulers — run in-process alongside the server.
require("./scheduler/seatHoldScheduler");
require("./scheduler/waitlistScheduler");
require("./scheduler/eventCleanupScheduler");

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/venues", require("./routes/venueRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/seats", require("./routes/seatRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/waitlist", require("./routes/waitlistRoutes"));
app.use("/api/search", require("./routes/searchRoutes"));

// Server-rendered pages
app.use("/", require("./routes/viewRoutes"));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler — catches anything thrown/rejected that
// individual controllers didn't already handle, so the server never
// crashes silently on an unexpected error.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Something went wrong.",
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
