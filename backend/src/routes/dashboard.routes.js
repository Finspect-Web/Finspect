const express = require("express");
const {
  getSummaryController,
  getActivityController,
  getStaffMonitoringController
} = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

router.get("/summary", getSummaryController);
router.get("/activity", getActivityController);
router.get("/staff-monitoring", authorize("ADMIN"), getStaffMonitoringController);

module.exports = router;
