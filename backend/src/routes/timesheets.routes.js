const express = require("express");
const {
  createTimesheetEntryController,
  getTimesheetEntriesController,
  updateTimesheetEntryController,
  deleteTimesheetEntryController
} = require("../controllers/timesheets.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

router.post("/", createTimesheetEntryController);
router.get("/", getTimesheetEntriesController);
router.put("/:id", updateTimesheetEntryController);
router.delete("/:id", deleteTimesheetEntryController);

module.exports = router;
