const asyncHandler = require("../utils/asyncHandler");
const {
  createTimesheetEntry,
  getTimesheetEntries,
  updateTimesheetEntry,
  deleteTimesheetEntry
} = require("../services/timesheets.service");

const createTimesheetEntryController = asyncHandler(async (req, res) => {
  const data = await createTimesheetEntry(req.body, req.user);
  res.status(201).json({
    success: true,
    message: "Timesheet entry created successfully.",
    data
  });
});

const getTimesheetEntriesController = asyncHandler(async (req, res) => {
  const data = await getTimesheetEntries(req.user, req.query);
  res.status(200).json({
    success: true,
    data
  });
});

const updateTimesheetEntryController = asyncHandler(async (req, res) => {
  const data = await updateTimesheetEntry(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    message: "Timesheet entry updated successfully.",
    data
  });
});

const deleteTimesheetEntryController = asyncHandler(async (req, res) => {
  await deleteTimesheetEntry(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: "Timesheet entry deleted successfully."
  });
});

module.exports = {
  createTimesheetEntryController,
  getTimesheetEntriesController,
  updateTimesheetEntryController,
  deleteTimesheetEntryController
};
