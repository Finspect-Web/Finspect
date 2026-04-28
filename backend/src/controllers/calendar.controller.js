const asyncHandler = require("../utils/asyncHandler");
const { getCalendarEvents } = require("../services/calendar.service");

const getCalendarEventsController = asyncHandler(async (req, res) => {
  const data = await getCalendarEvents(req.user, req.query);
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getCalendarEventsController
};
