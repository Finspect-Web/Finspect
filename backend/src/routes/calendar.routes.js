const express = require("express");
const { getCalendarEventsController } = require("../controllers/calendar.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/events", getCalendarEventsController);

module.exports = router;
