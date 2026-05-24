const app = require("./app");
const prisma = require("./prisma/client");
const { startTaskReminderCron } = require("./cron/taskReminder.cron");
const { startComplianceReminderCron } = require("./cron/complianceReminder.cron");
const { startGoogleCalendarSyncCron } = require("./cron/googleCalendarSync.cron.js");

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Finspect API running on port ${PORT}`);
  startTaskReminderCron();
  startComplianceReminderCron();
  startGoogleCalendarSyncCron();
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
