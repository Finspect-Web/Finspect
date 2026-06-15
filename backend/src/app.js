require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const documentRoutes = require("./routes/documents.routes");
const authRoutes = require("./routes/auth.routes");
const googleCalendarRoutes = require("./routes/googleCalendar.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { authenticate } = require("./middleware/auth.middleware");
const { searchGlobal } = require("./services/search.service");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
    : [])
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Finspect API is running."
  });
});

// Public search endpoint - handled directly, no authentication
app.get("/api/search", async (req, res, next) => {
  try {
    const data = await searchGlobal(req.query.q, req.user || null);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
});

// Public auth endpoints (login/register) - mount before authentication
app.use("/api/auth", authRoutes);

// Google Calendar OAuth callback needs to be accessible via redirect
// The OAuth routes are mounted under /api but the callback is authenticated via the redirect
app.use("/api", googleCalendarRoutes);

// Authenticated endpoints
app.use("/api/documents", authenticate, documentRoutes);
app.use("/api", authenticate, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
