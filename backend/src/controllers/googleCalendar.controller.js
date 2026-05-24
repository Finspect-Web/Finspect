const asyncHandler = require("../utils/asyncHandler");
const googleCalendarService = require("../services/googleCalendar.service");
const prisma = require("../prisma/client");

// GET /api/auth/google — Redirect to Google OAuth
const connectGoogleCalendar = asyncHandler(async (req, res) => {
  const authUrl = googleCalendarService.getAuthUrl(req.user.id);
  res.status(200).json({
    success: true,
    data: { authUrl },
  });
});

// GET /api/auth/google/callback — Handle OAuth callback (PUBLIC route)
// Uses the `state` JWT to identify which user is connecting
const googleCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl =
    process.env.FRONTEND_URL?.split(",")?.[0]?.trim() || "http://localhost:5173";

  if (!code) {
    return res.redirect(
      `${frontendUrl}/settings?googleCalendar=error&message=No+authorization+code+received`
    );
  }

  if (!state) {
    return res.redirect(
      `${frontendUrl}/settings?googleCalendar=error&message=Missing+state+parameter.+Please+try+again.`
    );
  }

  try {
    // Verify state JWT to identify the user
    const userId = googleCalendarService.verifyState(state);

    const tokens = await googleCalendarService.handleCallback(code);
    await googleCalendarService.storeTokens(userId, tokens);

    return res.redirect(`${frontendUrl}/settings?googleCalendar=connected`);
  } catch (error) {
    return res.redirect(
      `${frontendUrl}/settings?googleCalendar=error&message=${encodeURIComponent(error.message)}`
    );
  }
});

// GET /api/auth/google/status — Check connection status
const getGoogleCalendarStatus = asyncHandler(async (req, res) => {
  const status = await googleCalendarService.getCalendarStatus(req.user.id);
  res.status(200).json({
    success: true,
    data: status,
  });
});

// POST /api/auth/google/disconnect — Disconnect Google Calendar
const disconnectGoogleCalendar = asyncHandler(async (req, res) => {
  await googleCalendarService.revokeAndDisconnect(req.user.id);
  res.status(200).json({
    success: true,
    message: "Google Calendar disconnected successfully.",
  });
});

// GET /api/google-calendar/events — Fetch synced events for calendar view
// Admins can pass ?assignedToId=<userId> to filter events by a specific staff member
const getCalendarEvents = asyncHandler(async (req, res) => {
  const { from, to, assignedToId } = req.query;

  // Fetch user's google connected status
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { googleCalendarConnected: true },
  });

  const isAdmin = req.user.role === "ADMIN";

  // Determine which user's CalendarEvents to fetch
  // Admins can filter by assignedToId; non-admins always see only their own
  const calendarUserId = assignedToId && isAdmin ? assignedToId : req.user.id;

  const where = {
    userId: calendarUserId,
    ...(from || to
      ? {
          startAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [events, tasks, compliances] = await Promise.all([
    prisma.calendarEvent.findMany({
      where,
      orderBy: { startAt: "asc" },
    }),
    prisma.task.findMany({
      where: {
        ...(isAdmin ? (assignedToId ? { assignedToId } : {}) : { assignedToId: req.user.id }),
        dueDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        priority: true,
        googleEventId: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, companyName: true } },
      },
    }),
    prisma.complianceItem.findMany({
      where: {
        ...(isAdmin ? (assignedToId ? { assignedToId } : {}) : { assignedToId: req.user.id }),
        dueDate: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        status: true,
        type: true,
        recurrence: true,
        googleEventId: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, companyName: true } },
      },
    }),
  ]);

  // Map to unified event format
  const unifiedEvents = [
    ...events.map((e) => ({
      id: `cal:${e.id}`,
      type: "CALENDAR_EVENT",
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay || false,
      color: "#6366f1",
      syncStatus: e.syncStatus,
      recurrence: e.recurrence,
      googleMeetLink: e.googleMeetLink,
      sourceType: e.sourceType,
      sourceId: e.sourceId,
      payload: {
        description: e.description,
        attendees: e.attendees,
      },
    })),
    ...tasks.map((t) => ({
      id: `task:${t.id}`,
      type: "TASK_DUE",
      title: t.title,
      startAt: t.dueDate,
      endAt: t.dueDate,
      allDay: true,
      color: "#4c2ca7",
      googleSynced: !!t.googleEventId,
      payload: t,
    })),
    ...compliances.map((c) => ({
      id: `compliance:${c.id}`,
      type: "COMPLIANCE_DUE",
      title: c.title,
      startAt: c.dueDate,
      endAt: c.dueDate,
      allDay: true,
      color: "#0f766e",
      recurrence: c.recurrence,
      googleSynced: !!c.googleEventId,
      payload: c,
    })),
  ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  res.status(200).json({
    success: true,
    data: {
      from: from || null,
      to: to || null,
      totalEvents: unifiedEvents.length,
      events: unifiedEvents,
      googleConnected: user?.googleCalendarConnected || false,
    },
  });
});

module.exports = {
  connectGoogleCalendar,
  googleCallback,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
  getCalendarEvents,
};
