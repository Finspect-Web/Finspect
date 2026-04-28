const asyncHandler = require("../utils/asyncHandler");
const {
  checkInAttendance,
  checkOutAttendance,
  markAttendance,
  getAttendanceToday,
  getAttendanceList
} = require("../services/attendance.service");

const checkInController = asyncHandler(async (req, res) => {
  const data = await checkInAttendance(req.user);
  res.status(200).json({
    success: true,
    message: "Checked in successfully.",
    data
  });
});

const checkOutController = asyncHandler(async (req, res) => {
  const data = await checkOutAttendance(req.user);
  res.status(200).json({
    success: true,
    message: "Checked out successfully.",
    data
  });
});

const markAttendanceController = asyncHandler(async (req, res) => {
  const data = await markAttendance(req.body);
  res.status(200).json({
    success: true,
    message: "Attendance saved successfully.",
    data
  });
});

const getAttendanceTodayController = asyncHandler(async (req, res) => {
  const data = await getAttendanceToday(req.user);
  res.status(200).json({
    success: true,
    data
  });
});

const getAttendanceListController = asyncHandler(async (req, res) => {
  const data = await getAttendanceList(req.user, req.query);
  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  checkInController,
  checkOutController,
  markAttendanceController,
  getAttendanceTodayController,
  getAttendanceListController
};
