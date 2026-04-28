const { TaskStatus } = require("@prisma/client");
const prisma = require("../prisma/client");
const { sendTaskReminderEmail } = require("../utils/notification");

function startTaskReminderCron() {
  const cron = require("node-cron");

  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const tasks = await prisma.task.findMany({
        where: {
          status: TaskStatus.PENDING,
          dueDate: {
            gte: now,
            lte: next24Hours
          },
          reminderSentAt: null
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          }
        }
      });

      for (const task of tasks) {
        await sendTaskReminderEmail(task);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminderSentAt: new Date() }
        });
      }
    } catch (error) {
      console.error("Task reminder cron failed:", error.message);
    }
  });
}

module.exports = {
  startTaskReminderCron
};
