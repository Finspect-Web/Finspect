const asyncHandler = require("../utils/asyncHandler");
const {
  getDashboardSummary,
  getActivityLogs,
  getStaffMonitoring
} = require("../services/dashboard.service");

const getSummaryController = asyncHandler(async (req, res) => {
  const data = await getDashboardSummary(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getActivityController = asyncHandler(async (req, res) => {
  const data = await getActivityLogs(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getStaffMonitoringController = asyncHandler(async (req, res) => {
  const data = await getStaffMonitoring(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getSummaryController,
  getActivityController,
  getStaffMonitoringController
};
