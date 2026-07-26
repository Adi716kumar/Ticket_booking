const { Server } = require("socket.io");

let io;

/**
 * Initializes Socket.IO on top of the existing HTTP server.
 * Called once from app.js after http.createServer(app).
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    // Clients join a room per event so seat-map updates only broadcast
    // to people actually viewing that show, not every connected client.
    socket.on("joinEvent", (eventId) => {
      socket.join(`event:${eventId}`);
    });

    socket.on("leaveEvent", (eventId) => {
      socket.leave(`event:${eventId}`);
    });
  });

  return io;
}

/**
 * Returns the initialized io instance. Throws if called before initSocket —
 * this is intentional, it surfaces wiring mistakes immediately instead of
 * silently no-op-ing (which is what caused the real-time feature to be
 * silently dead in the previous version of this project).
 */
function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket(server) first.");
  }
  return io;
}

module.exports = { initSocket, getIO };
