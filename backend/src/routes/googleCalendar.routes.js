const express = require("express");
const {
  connectGoogleCalendar,
  googleCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  getCalendarEvents,
} = require("../controllers/googleCalendar.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

// OAuth callback route — PUBLIC (redirect from Google, no auth header)
router.get("/auth/google/callback", googleCallback);

// All other Google Calendar routes require authentication
router.get("/auth/google", authenticate, connectGoogleCalendar);
router.get("/auth/google/status", authenticate, getGoogleCalendarStatus);
router.post("/auth/google/disconnect", authenticate, disconnectGoogleCalendar);

// Calendar events API
router.get("/google-calendar/events", authenticate, getCalendarEvents);

module.exports = router;
