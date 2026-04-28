const nodemailer = require("nodemailer");
const twilio = require("twilio");

let transporter;
let twilioClient;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return transporter;
}

function getTwilioClient() {
  if (twilioClient) {
    return twilioClient;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return null;
  }

  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return twilioClient;
}

async function sendEmail({ to, subject, html, text }) {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    console.warn(`SMTP not configured. Email skipped for ${to}.`);
    return { skipped: true };
  }

  return emailTransporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text
  });
}

async function sendWhatsAppMessage(messageBody) {
  const client = getTwilioClient();
  if (!client) {
    console.warn("Twilio credentials not configured. WhatsApp notification skipped.");
    return { skipped: true };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.TWILIO_WHATSAPP_TO;
  if (!from || !to) {
    console.warn("Twilio WhatsApp sender/recipient not configured. Notification skipped.");
    return { skipped: true };
  }

  return client.messages.create({
    body: messageBody,
    from,
    to
  });
}

async function sendTaskAssignmentNotifications(task) {
  const subject = `New task assigned: ${task.title}`;
  const text = `You have been assigned a task for ${task.client.companyName}. Due date: ${new Date(task.dueDate).toLocaleString()}. Priority: ${task.priority}.`;
  const html = `<p>You have been assigned a task for <strong>${task.client.companyName}</strong>.</p><p><strong>Task:</strong> ${task.title}</p><p><strong>Due:</strong> ${new Date(task.dueDate).toLocaleString()}</p><p><strong>Priority:</strong> ${task.priority}</p>`;

  const whatsappMessage = `*Finspect Task Assignment*\nTask: ${task.title}\nClient: ${task.client.companyName}\nDue: ${new Date(task.dueDate).toLocaleString()}\nPriority: ${task.priority}\nAssigned to: ${task.assignedTo.name}`;

  const results = await Promise.allSettled([
    sendEmail({ to: task.assignedTo.email, subject, text, html }),
    sendWhatsAppMessage(whatsappMessage)
  ]);

  results
    .filter((item) => item.status === "rejected")
    .forEach((item) => console.error("Assignment notification error:", item.reason?.message || item.reason));
}

async function sendTaskReminderEmail(task) {
  const subject = `Reminder: task due within 24 hours - ${task.title}`;
  const text = `Reminder: "${task.title}" for ${task.client.companyName} is due on ${new Date(task.dueDate).toLocaleString()}.`;

  await sendEmail({
    to: task.assignedTo.email,
    subject,
    text,
    html: `<p>Reminder: <strong>${task.title}</strong> for <strong>${task.client.companyName}</strong> is due on ${new Date(task.dueDate).toLocaleString()}.</p>`
  });
}

module.exports = {
  sendTaskAssignmentNotifications,
  sendTaskReminderEmail
};
