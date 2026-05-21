const express = require("express");
const userRoutes = require("./users.routes");
const clientRoutes = require("./clients.routes");
const taskRoutes = require("./tasks.routes");
const credentialRoutes = require("./credentials.routes");
const dashboardRoutes = require("./dashboard.routes");
const invoiceRoutes = require("./invoices.routes");
const complianceRoutes = require("./compliance.routes");
const workflowEngineRoutes = require("./workflowEngine.routes");
const attendanceRoutes = require("./attendance.routes");
const timesheetRoutes = require("./timesheets.routes");
const calendarRoutes = require("./calendar.routes");

const router = express.Router();

router.use("/users", userRoutes);
router.use("/clients", clientRoutes);
router.use("/tasks", taskRoutes);
router.use("/credentials", credentialRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/compliance", complianceRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/timesheets", timesheetRoutes);
router.use("/calendar", calendarRoutes);
router.use("/", workflowEngineRoutes);

module.exports = router;
