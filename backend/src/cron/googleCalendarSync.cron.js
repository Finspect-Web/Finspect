const prisma = require("../prisma/client");
const {
  pullChanges,
  pushPendingChanges,
  syncUserCalendar,
} = require("../services/googleCalendar.service");

// Guard to prevent overlapping runs (sync may take >30 min for many users)
let isRunning = false;

// Runs every 30 minutes — pulls Google Calendar changes back into the app DB
// and pushes any pending local changes out to Google.
function startGoogleCalendarSyncCron() {
  const cron = require("node-cron");

  // Every 30 minutes at :00 and :30
  cron.schedule("*/30 * * * *", async () => {
    if (isRunning) {
      console.log("[GoogleCalendarSync] Previous sync still in progress. Skipping this cycle.");
      return;
    }

    isRunning = true;

    console.log("[GoogleCalendarSync] Starting two-way sync for all connected users...");

    try {
      const connectedUsers = await prisma.user.findMany({
        where: { googleCalendarConnected: true },
        select: { id: true, name: true, googleEmail: true },
      });

      if (connectedUsers.length === 0) {
        console.log("[GoogleCalendarSync] No connected users found. Skipping.");
        return;
      }

      const summaries = [];

      for (const user of connectedUsers) {
        try {
          const result = await syncUserCalendar(user.id);

          const logParts = [];
          const pull = result.pull;
          const push = result.push;

          if (pull.created || pull.updated || pull.deleted) {
            logParts.push(
              `pulled: ${pull.created} created, ${pull.updated} updated, ${pull.deleted} deleted`
            );
          }
          if (push.synced || push.failed) {
            logParts.push(`pushed: ${push.synced} synced, ${push.failed} failed`);
          }

          const summary = logParts.length > 0 ? logParts.join(" | ") : "no changes";
          if (result.errors.length > 0) {
            summaries.push(
              `${user.name} (${user.googleEmail}) — ${summary} — errors: ${result.errors.join("; ")}`
            );
          } else {
            summaries.push(`${user.name} (${user.googleEmail}) — ${summary}`);
          }
        } catch (userError) {
          summaries.push(
            `${user.name} (${user.googleEmail}) — sync failed: ${userError.message}`
          );
        }
      }

      console.log("[GoogleCalendarSync] Sync complete:");
      summaries.forEach((s) => console.log(`  ${s}`));
    } catch (error) {
      console.error("[GoogleCalendarSync] Cron job failed:", error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log("[GoogleCalendarSync] Cron scheduled: every 30 minutes");
}

module.exports = {
  startGoogleCalendarSyncCron,
};
