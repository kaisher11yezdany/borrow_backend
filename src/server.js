require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const multer = require("multer");
const { createServer } = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const accountingRoutes = require("./routes/accountingRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const teamRoutes = require("./routes/teamRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const noteRoutes = require("./routes/noteRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const kycRoutes = require("./routes/kycRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", methods: ["GET", "POST"] }
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.io = io;
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/tasks", taskRoutes);

app.use(notFound);
// Multer errors (bad file type, too large) arrive here rather than the generic handler.
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only image files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});
app.use(errorHandler);

// Last-resort net for anything thrown outside a request (e.g. a rejected
// promise not tied to any req/res) — every route handler is already wrapped
// via asyncHandler, so this should rarely fire. Logs instead of crashing.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));

const PORT = process.env.PORT || 5000;

(async function start() {
  try {
    await connectDB();

    // Socket.IO connection handling
    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });

    httpServer.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
