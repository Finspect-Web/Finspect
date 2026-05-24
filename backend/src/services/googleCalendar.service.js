const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma/client");
const AppError = require("../utils/appError");
const { encryptText, decryptText } = require("../utils/crypto");

// ---------------------------------------------------------------------------
// OAuth2 client factory
// ---------------------------------------------------------------------------
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Google redirects the user to this backend endpoint after OAuth consent
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:5000/api/auth/google/callback";

  if (!clientId || !clientSecret) {
    throw new AppError(
      "Google Calendar integration is not configured. Contact your administrator.",
      503
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ---------------------------------------------------------------------------
// Build an authenticated Google Calendar client for a user
// ---------------------------------------------------------------------------
async function getAuthenticatedCalendarClient(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      googleAccessToken: true,
      googleRefreshToken: true,
      googleCalendarConnected: true,
      tokenExpiryDate: true,
    },
  });

  if (!user || !user.googleCalendarConnected) {
    throw new AppError("Google Calendar is not connected. Please connect your calendar first.", 400);
  }

  const oauth2Client = getOAuth2Client();

  // Decrypt stored tokens
  let accessToken, refreshToken;
  try {
    accessToken = decryptText(user.googleAccessToken);
    refreshToken = decryptText(user.googleRefreshToken);
  } catch {
    throw new AppError("Failed to decrypt stored credentials. Please reconnect Google Calendar.", 401);
  }

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: user.tokenExpiryDate?.getTime(),
  });

  // Auto-refresh if expired
  oauth2Client.on("tokens", async (tokens) => {
    const updateData = {};
    if (tokens.access_token) {
      updateData.googleAccessToken = encryptText(tokens.access_token);
    }
    if (tokens.refresh_token) {
      updateData.googleRefreshToken = encryptText(tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      updateData.tokenExpiryDate = new Date(tokens.expiry_date);
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------
async function storeTokens(userId, tokens) {
  const updateData = {};

  if (tokens.access_token) {
    updateData.googleAccessToken = encryptText(tokens.access_token);
  }
  if (tokens.refresh_token) {
    updateData.googleRefreshToken = encryptText(tokens.refresh_token);
  }
  if (tokens.expiry_date) {
    updateData.tokenExpiryDate = new Date(tokens.expiry_date);
  }

  updateData.googleCalendarConnected = true;
  updateData.googleEmail = tokens.googleEmail || null;

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

async function disconnectGoogleCalendar(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleCalendarConnected: false,
      googleEmail: null,
      tokenExpiryDate: null,
      googleSyncToken: null,
    },
  });
}

// ---------------------------------------------------------------------------
// OAuth URL generation — includes user JWT in state param
// ---------------------------------------------------------------------------
function getAuthUrl(userId) {
  const oauth2Client = getOAuth2Client();

  // Sign a JWT with the user ID to identify them in the callback
  const statePayload = jwt.sign(
    { uid: userId, purpose: "google-oauth" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state: statePayload,
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
}

// ---------------------------------------------------------------------------
// Exchange authorization code for tokens
// ---------------------------------------------------------------------------
async function handleCallback(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new AppError(
      "No refresh token received. Please disconnect and reconnect your Google Calendar.",
      400
    );
  }

  // Get user's Google profile email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();
  tokens.googleEmail = userInfo.email;

  return tokens;
}

// ---------------------------------------------------------------------------
// Reconnect / refresh token (called when API returns 401)
// ---------------------------------------------------------------------------
async function refreshToken(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleRefreshToken: true },
  });

  if (!user?.googleRefreshToken) {
    throw new AppError("No refresh token available. Please reconnect Google Calendar.", 401);
  }

  let refreshToken;
  try {
    refreshToken = decryptText(user.googleRefreshToken);
  } catch {
    throw new AppError("Failed to decrypt refresh token. Please reconnect Google Calendar.", 401);
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  await storeTokens(userId, credentials);

  return credentials;
}

// ---------------------------------------------------------------------------
// Build a Google Calendar event resource
// ---------------------------------------------------------------------------
function buildEventResource({ title, description, startAt, endAt, attendees, recurrence, addMeetLink }) {
  const resource = {
    summary: title,
    description: description || "",
    start: {
      dateTime: new Date(startAt).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: new Date(endAt).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
  };

  if (attendees && attendees.length > 0) {
    resource.attendees = attendees.map((a) => {
      if (typeof a === "string") return { email: a };
      return { email: a.email, displayName: a.name };
    });
  }

  if (recurrence && recurrence !== "NONE") {
    resource.recurrence = [buildRRule(recurrence, startAt)];
  }

  if (addMeetLink) {
    resource.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return resource;
}

// ---------------------------------------------------------------------------
// Build RRULE string from RecurrenceType
// ---------------------------------------------------------------------------
function buildRRule(recurrence, startAt) {
  const start = new Date(startAt);
  const day = start.getUTCDate();
  const byMonthDay = `BYMONTHDAY=${day}`;

  switch (recurrence) {
    case "MONTHLY":
      return `RRULE:FREQ=MONTHLY;${byMonthDay};INTERVAL=1`;
    case "QUARTERLY":
      return `RRULE:FREQ=MONTHLY;${byMonthDay};INTERVAL=3`;
    case "YEARLY":
      return `RRULE:FREQ=YEARLY;${byMonthDay};INTERVAL=1`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Create a Google Calendar event
// ---------------------------------------------------------------------------
async function createCalendarEvent(userId, eventData) {
  const calendar = await getAuthenticatedCalendarClient(userId);
  const eventResource = buildEventResource(eventData);

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventResource,
    conferenceDataVersion: eventData.addMeetLink ? 1 : 0,
    sendUpdates: "all",
  });

  return response.data;
}

// ---------------------------------------------------------------------------
// Update a Google Calendar event
// ---------------------------------------------------------------------------
async function updateCalendarEvent(userId, googleEventId, eventData) {
  const calendar = await getAuthenticatedCalendarClient(userId);
  const eventResource = buildEventResource(eventData);

  const response = await calendar.events.update({
    calendarId: "primary",
    eventId: googleEventId,
    requestBody: eventResource,
    sendUpdates: "all",
  });

  return response.data;
}

// ---------------------------------------------------------------------------
// Delete a Google Calendar event
// ---------------------------------------------------------------------------
async function deleteCalendarEvent(userId, googleEventId) {
  const calendar = await getAuthenticatedCalendarClient(userId);

  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId,
    sendUpdates: "all",
  });
}

// ---------------------------------------------------------------------------
// Fetch events from Google Calendar (for sync)
// ---------------------------------------------------------------------------
async function fetchGoogleEvents(userId, from, to) {
  const calendar = await getAuthenticatedCalendarClient(userId);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: from ? new Date(from).toISOString() : undefined,
    timeMax: to ? new Date(to).toISOString() : undefined,
    singleEvents: true,
    orderBy: "startTime",
  });

  return response.data.items || [];
}

// ---------------------------------------------------------------------------
// Disconnect and revoke tokens
// ---------------------------------------------------------------------------
async function revokeAndDisconnect(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true },
  });

  if (user?.googleAccessToken) {
    try {
      const accessToken = decryptText(user.googleAccessToken);
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ access_token: accessToken });
      await oauth2Client.revokeCredentials();
    } catch {
      // Best-effort revocation
    }
  }

  await disconnectGoogleCalendar(userId);
}

// ---------------------------------------------------------------------------
// Verify state parameter from OAuth callback
// ---------------------------------------------------------------------------
function verifyState(state) {
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    if (decoded.purpose !== "google-oauth" || !decoded.uid) {
      throw new Error("Invalid state parameter");
    }
    return decoded.uid;
  } catch (error) {
    throw new AppError("Invalid or expired OAuth state. Please try connecting again.", 400);
  }
}

// ---------------------------------------------------------------------------
// Sync: create/update event in Google Calendar
// ---------------------------------------------------------------------------
async function syncEventToGoogle(userId, sourceType, sourceId, eventDetails) {
  try {
    const googleEvent = await createCalendarEvent(userId, eventDetails);

    await prisma.calendarEvent.upsert({
      where: { id: (
        await prisma.calendarEvent.findFirst({
          where: { sourceType, sourceId, userId },
          select: { id: true },
        })
      )?.id || "00000000-0000-0000-0000-000000000000" },
      create: {
        googleEventId: googleEvent.id,
        calendarId: googleEvent.organizer?.email || "primary",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        sourceType,
        sourceId,
        title: eventDetails.title,
        description: eventDetails.description,
        startAt: new Date(eventDetails.startAt),
        endAt: new Date(eventDetails.endAt),
        recurrence: eventDetails.recurrence || null,
        attendees: eventDetails.attendees || [],
        googleMeetLink: googleEvent.hangoutLink || null,
        userId,
      },
      update: {
        googleEventId: googleEvent.id,
        calendarId: googleEvent.organizer?.email || "primary",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        title: eventDetails.title,
        description: eventDetails.description,
        startAt: new Date(eventDetails.startAt),
        endAt: new Date(eventDetails.endAt),
        recurrence: eventDetails.recurrence || null,
        attendees: eventDetails.attendees || [],
        googleMeetLink: googleEvent.hangoutLink || null,
      },
    });

    return googleEvent.id;
  } catch (error) {
    try {
      const existing = await prisma.calendarEvent.findFirst({
        where: { sourceType, sourceId, userId },
        select: { id: true },
      });
      if (existing) {
        await prisma.calendarEvent.update({
          where: { id: existing.id },
          data: { syncStatus: "FAILED" },
        });
      } else {
        await prisma.calendarEvent.create({
          data: {
            syncStatus: "FAILED",
            sourceType,
            sourceId,
            title: eventDetails.title,
            startAt: new Date(eventDetails.startAt),
            endAt: new Date(eventDetails.endAt),
            userId,
          },
        });
      }
    } catch {
      // Best effort
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sync: update existing event
// ---------------------------------------------------------------------------
async function syncEventUpdate(userId, sourceType, sourceId, eventDetails) {
  const existing = await prisma.calendarEvent.findFirst({
    where: { sourceType, sourceId, userId },
  });

  if (!existing?.googleEventId) {
    // No Google event yet — create one
    return syncEventToGoogle(userId, sourceType, sourceId, eventDetails);
  }

  try {
    const googleEvent = await updateCalendarEvent(userId, existing.googleEventId, eventDetails);

    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        title: eventDetails.title,
        description: eventDetails.description,
        startAt: new Date(eventDetails.startAt),
        endAt: new Date(eventDetails.endAt),
        recurrence: eventDetails.recurrence || null,
        attendees: eventDetails.attendees || [],
        googleMeetLink: googleEvent.hangoutLink || existing.googleMeetLink,
      },
    });

    return googleEvent.id;
  } catch (error) {
    await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: { syncStatus: "FAILED" },
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sync: delete event
// ---------------------------------------------------------------------------
async function syncEventDelete(userId, sourceType, sourceId) {
  const existing = await prisma.calendarEvent.findFirst({
    where: { sourceType, sourceId, userId },
  });

  if (!existing) return;

  if (existing.googleEventId) {
    try {
      await deleteCalendarEvent(userId, existing.googleEventId);
    } catch {
      // Ignore if event already deleted on Google side
    }
  }

  await prisma.calendarEvent.delete({ where: { id: existing.id } });
}

// ---------------------------------------------------------------------------
// Get user's calendar sync status
// ---------------------------------------------------------------------------
async function getCalendarStatus(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleCalendarConnected: true,
      googleEmail: true,
    },
  });

  return {
    connected: user?.googleCalendarConnected || false,
    email: user?.googleEmail || null,
  };
}

// ---------------------------------------------------------------------------
// Sync token management — stored encrypted on User
// ---------------------------------------------------------------------------
async function getSyncToken(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleSyncToken: true },
  });
  return user?.googleSyncToken || null;
}

async function saveSyncToken(userId, syncToken) {
  await prisma.user.update({
    where: { id: userId },
    data: { googleSyncToken: syncToken || null },
  });
}

// ---------------------------------------------------------------------------
// Pull changes FROM Google Calendar and update our local CalendarEvent records
// ---------------------------------------------------------------------------
// Returns { created: number, updated: number, deleted: number, errors: string[] }
async function pullChanges(userId) {
  const result = { created: 0, updated: 0, deleted: 0, errors: [] };

  let calendar;
  try {
    calendar = await getAuthenticatedCalendarClient(userId);
  } catch (err) {
    // User not connected — skip silently
    return result;
  }

  const syncToken = await getSyncToken(userId);
  const params = {
    calendarId: "primary",
    singleEvents: true,
    showDeleted: true,
  };

  if (syncToken) {
    // Incremental sync — only fetch changes since last sync
    params.syncToken = syncToken;
  } else {
    // Full sync — fetch events from the past 90 days through next 90 days
    const now = new Date();
    params.timeMin = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    params.timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  }

  let pageToken;
  try {
    do {
      if (pageToken) params.pageToken = pageToken;

      const response = await calendar.events.list(params);
      const events = response.data.items || [];

      // Store new syncToken for next incremental sync
      if (response.data.nextSyncToken) {
        await saveSyncToken(userId, response.data.nextSyncToken);
      }

      for (const gevent of events) {
        const googleEventId = gevent.id;
        const isCancelled = gevent.status === "cancelled";

        // Find matching local record by googleEventId
        const localEvent = await prisma.calendarEvent.findFirst({
          where: { googleEventId, userId },
        });

        if (isCancelled) {
          if (localEvent) {
            // Event deleted in Google — update sync status but keep record
            await prisma.calendarEvent.update({
              where: { id: localEvent.id },
              data: {
                syncStatus: "FAILED",
                lastSyncedAt: new Date(),
              },
            });
            result.deleted++;
          }
          continue;
        }

        if (!gevent.start || !gevent.end) continue;

        const startAt = gevent.start.dateTime
          ? new Date(gevent.start.dateTime)
          : new Date(gevent.start.date + "T00:00:00");
        const endAt = gevent.end.dateTime
          ? new Date(gevent.end.dateTime)
          : new Date(gevent.end.date + "T23:59:59");

        const eventData = {
          title: gevent.summary || "(Untitled)",
          description: gevent.description || null,
          startAt,
          endAt,
          allDay: !gevent.start.dateTime,
          recurrence: gevent.recurrence ? gevent.recurrence.join("; ") : null,
          attendees: gevent.attendees
            ? gevent.attendees.map((a) => ({
                email: a.email,
                name: a.displayName || a.email,
                responseStatus: a.responseStatus || "needsAction",
              }))
            : [],
          googleMeetLink: gevent.hangoutLink || null,
          lastSyncedAt: new Date(),
          syncStatus: "SYNCED",
        };

        if (localEvent) {
          // Only update if the local event's source is still tracked by us
          // (TASK/COMPLIANCE events are managed by the app — skip updating title/desc
          //  from Google so we don't lose app-side edits, BUT update timing & meet)
          if (localEvent.sourceType === "TASK" || localEvent.sourceType === "COMPLIANCE") {
            // Update only Google-managed fields, not the source title/description
            const { title, description, ...googleFields } = eventData;
            await prisma.calendarEvent.update({
              where: { id: localEvent.id },
              data: googleFields,
            });
          } else {
            // Google-only events — full update
            await prisma.calendarEvent.update({
              where: { id: localEvent.id },
              data: eventData,
            });
          }
          result.updated++;
        } else {
          // New event from Google — store it with sourceType "GOOGLE_ONLY"
          await prisma.calendarEvent.create({
            data: {
              googleEventId,
              calendarId: gevent.organizer?.email || "primary",
              userId,
              sourceType: "GOOGLE_ONLY",
              sourceId: googleEventId,
              ...eventData,
            },
          });
          result.created++;
        }
      }

      pageToken = response.data.nextPageToken;
    } while (pageToken);
  } catch (error) {
    // If syncToken is invalid/expired (410 GONE), reset and do full sync next time
    if (error.code === 410) {
      await saveSyncToken(userId, null);
      result.errors.push("Sync token expired — will do full resync next run");
    } else {
      result.errors.push(error.message);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Push pending local changes TO Google Calendar
// ---------------------------------------------------------------------------
// For any CalendarEvent with syncStatus = "PENDING" that has a googleEventId,
// we push the updated event data to Google.
// Returns { synced: number, failed: number, errors: string[] }
async function pushPendingChanges(userId) {
  const result = { synced: 0, failed: 0, errors: [] };

  const pendingEvents = await prisma.calendarEvent.findMany({
    where: {
      userId,
      syncStatus: "PENDING",
      googleEventId: { not: null },
    },
  });

  if (pendingEvents.length === 0) return result;

  let calendar;
  try {
    calendar = await getAuthenticatedCalendarClient(userId);
  } catch (err) {
    result.errors.push(err.message);
    return result;
  }

  for (const localEvent of pendingEvents) {
    try {
      const eventResource = buildEventResource({
        title: localEvent.title,
        description: localEvent.description,
        startAt: localEvent.startAt,
        endAt: localEvent.endAt,
        attendees: localEvent.attendees || [],
        recurrence: localEvent.recurrence,
        addMeetLink: !!localEvent.googleMeetLink,
      });

      await calendar.events.update({
        calendarId: "primary",
        eventId: localEvent.googleEventId,
        requestBody: eventResource,
        sendUpdates: "all",
      });

      await prisma.calendarEvent.update({
        where: { id: localEvent.id },
        data: {
          syncStatus: "SYNCED",
          lastSyncedAt: new Date(),
        },
      });

      result.synced++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Event ${localEvent.id}: ${error.message}`);

      // If 404/410, the event was deleted on Google side — remove our reference
      if (error.code === 404 || error.code === 410) {
        await prisma.calendarEvent.update({
          where: { id: localEvent.id },
          data: {
            googleEventId: null,
            syncStatus: "FAILED",
            lastSyncedAt: new Date(),
          },
        });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Full two-way sync for a single user
// ---------------------------------------------------------------------------
async function syncUserCalendar(userId) {
  const errors = [];

  // 1. Pull changes from Google → local DB
  const pull = await pullChanges(userId);
  if (pull.errors.length > 0) errors.push(...pull.errors);

  // 2. Push local pending changes → Google
  const push = await pushPendingChanges(userId);
  if (push.errors.length > 0) errors.push(...push.errors);

  return {
    pull: { created: pull.created, updated: pull.updated, deleted: pull.deleted },
    push: { synced: push.synced, failed: push.failed },
    errors,
  };
}

module.exports = {
  getOAuth2Client,
  getAuthenticatedCalendarClient,
  getAuthUrl,
  handleCallback,
  storeTokens,
  verifyState,
  refreshToken,
  disconnectGoogleCalendar,
  revokeAndDisconnect,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  fetchGoogleEvents,
  syncEventToGoogle,
  syncEventUpdate,
  syncEventDelete,
  getCalendarStatus,
  getSyncToken,
  saveSyncToken,
  pullChanges,
  pushPendingChanges,
  syncUserCalendar,
};
