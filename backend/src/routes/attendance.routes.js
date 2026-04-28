const express = require("express");
const {
  checkInController,
  checkOutController,
  markAttendanceController,
  getAttendanceTodayController,
  getAttendanceListController
} = require("../controllers/attendance.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/check-in", checkInController);
router.post("/check-out", checkOutController);
router.get("/today", getAttendanceTodayController);
router.get("/", getAttendanceListController);
router.post("/mark", authorize("ADMIN"), markAttendanceController);

module.exports = router;
