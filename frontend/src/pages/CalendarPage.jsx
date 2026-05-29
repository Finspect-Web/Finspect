import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Calendar as CalendarIcon,
  Video,
  ArrowUpRight,
  List,
  Rows,
  Square,
  Users,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "../components/PageTransition";
import {
  getGoogleCalendarEvents,
  getGoogleAuthUrl,
  getGoogleCalendarStatus,
  disconnectGoogleCalendar,
} from "../api/googleCalendarApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";
import { formatDate, formatDateTime } from "../utils/date";

// -------------------------------------------------------
// Constants
// -------------------------------------------------------
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM → 10 PM
const HOUR_HEIGHT = 56; // px per hour row
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SWIPE_THRESHOLD = 60;

const EVENT_COLORS = {
  CALENDAR_EVENT: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500", border: "border-indigo-300", ring: "ring-indigo-400" },
  TASK_DUE: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-600", border: "border-purple-300", ring: "ring-purple-400" },
  COMPLIANCE_DUE: { bg: "bg-teal-100", text: "text-teal-700", dot: "bg-teal-600", border: "border-teal-300", ring: "ring-teal-400" },
};

const TYPE_LABELS = {
  CALENDAR_EVENT: "Google Event",
  TASK_DUE: "Task",
  COMPLIANCE_DUE: "Compliance",
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const days = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  return days;
}

function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getViewLabel(date, viewMode) {
  if (viewMode === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (viewMode === "week") {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const opt = { month: "short", day: "numeric" };
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString("en-US", opt)} – ${end.toLocaleDateString("en-US", opt)}, ${start.getFullYear()}`;
  }
  // day
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function getEventTimeStyle(startAt, allDay) {
  if (allDay) return null;
  const d = new Date(startAt);
  const hours = d.getHours() + d.getMinutes() / 60;
  const top = (hours - 6) * HOUR_HEIGHT;
  return { top: Math.max(0, top), height: HOUR_HEIGHT - 4 };
}

function formatHour(hour) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${h} ${ampm}`;
}

// -------------------------------------------------------
// Swipe hook
// -------------------------------------------------------
function useSwipe(onSwipeLeft, onSwipeRight) {
  const dragRef = useRef(null);
  const state = useRef({ startX: 0, startY: 0, isDragging: false, deltaX: 0 });

  const handlers = useMemo(
    () => ({
      onPointerDown(e) {
        state.current = { startX: e.clientX, startY: e.clientY, isDragging: true, deltaX: 0 };
        if (dragRef.current) dragRef.current.setPointerCapture(e.pointerId);
      },
      onPointerMove(e) {
        if (!state.current.isDragging) return;
        const dx = e.clientX - state.current.startX;
        const dy = e.clientY - state.current.startY;
        // Only treat as horizontal swipe if horizontal movement dominates
        if (Math.abs(dx) > Math.abs(dy)) {
          state.current.deltaX = dx;
          if (dragRef.current) {
            dragRef.current.style.transform = `translateX(${dx * 0.3}px)`;
            dragRef.current.style.transition = "none";
          }
        }
      },
      onPointerUp() {
        if (!state.current.isDragging) return;
        state.current.isDragging = false;
        const dx = state.current.deltaX;
        if (dragRef.current) {
          dragRef.current.style.transform = "";
          dragRef.current.style.transition = "";
        }
        if (Math.abs(dx) > SWIPE_THRESHOLD) {
          if (dx > 0) onSwipeRight();
          else onSwipeLeft();
        }
      },
    }),
    [onSwipeLeft, onSwipeRight]
  );

  return { dragRef, handlers };
}

// -------------------------------------------------------
// Component
// -------------------------------------------------------
export default function CalendarPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState(today);
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewMode, setViewMode] = useState("month"); // month | week | day
  const [hoveredHour, setHoveredHour] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const isAdmin = user?.role === "ADMIN";

  // Fetch staff users for admin filter
  useEffect(() => {
    if (!isAdmin) return;
    getUsers()
      .then((users) => setStaffUsers(users))
      .catch(() => {});
  }, [isAdmin]);

  // Load Google Calendar connect status
  const loadCalendarStatus = useCallback(async () => {
    try {
      const status = await getGoogleCalendarStatus();
      setGoogleConnected(status.connected);
      setCalendarEmail(status.email);
    } catch {
      // Not connected
    }
  }, []);

  useEffect(() => {
    loadCalendarStatus();
  }, [loadCalendarStatus]);

  // Handle OAuth callback query params from Google Calendar redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcParam = params.get("googleCalendar");
    if (gcParam === "connected") {
      loadCalendarStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (gcParam === "error") {
      setError(params.get("message") || "Failed to connect Google Calendar.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadCalendarStatus]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Derived view data
  const monthDays = useMemo(() => getMonthData(year, month), [year, month]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const dayDate = currentDate;

  // Navigation
  const goPrev = useCallback(() => {
    if (viewMode === "month") setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
    }
  }, [viewMode, currentDate]);

  const goNext = useCallback(() => {
    if (viewMode === "month") setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    else if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
    }
  }, [viewMode, currentDate]);

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // Swipe handlers
  const { dragRef, handlers: swipeHandlers } = useSwipe(goNext, goPrev);

  // Load events based on view
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      let from, to;
      if (viewMode === "month") {
        from = new Date(year, month - 1, 15).toISOString().slice(0, 10);
        to = new Date(year, month + 1, 16).toISOString().slice(0, 10);
      } else if (viewMode === "week") {
        const start = getWeekStart(currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        from = start.toISOString().slice(0, 10);
        to = end.toISOString().slice(0, 10);
      } else {
        from = currentDate.toISOString().slice(0, 10);
        to = currentDate.toISOString().slice(0, 10);
      }
      const params = { from, to };
      if (isAdmin && selectedUserId) {
        params.assignedToId = selectedUserId;
      }
      const data = await getGoogleCalendarEvents(params);
      setEvents(data.events || []);
      setTotalEvents(data.totalEvents || 0);
      setGoogleConnected(data.googleConnected || false);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [year, month, viewMode, currentDate, selectedUserId, isAdmin]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleConnectGoogle = async () => {
    try {
      setConnecting(true);
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (connectError) {
      setError(connectError.message);
      setConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm("Disconnect Google Calendar? Events will no longer sync.")) return;
    try {
      setDisconnecting(true);
      await disconnectGoogleCalendar();
      setGoogleConnected(false);
      setCalendarEmail(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {};
    for (const event of events) {
      const key = formatDate(event.startAt);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  // Group events by date+hour for week/day views
  const eventsByHour = useCallback(
    (day) => {
      const key = formatDate(day);
      const dayEvents = eventsByDate[key] || [];
      const allDay = dayEvents.filter((e) => e.allDay);
      const timed = dayEvents.filter((e) => !e.allDay);
      const byHour = {};
      for (const hour of HOURS) {
        byHour[hour] = timed.filter((e) => {
          const d = new Date(e.startAt);
          return d.getHours() === hour;
        });
      }
      return { allDay, byHour };
    },
    [eventsByDate]
  );

  const viewLabel = getViewLabel(currentDate, viewMode);

  // Detail panel
  const selectedEventColors = selectedEvent
    ? EVENT_COLORS[selectedEvent.type] || EVENT_COLORS.CALENDAR_EVENT
    : EVENT_COLORS.CALENDAR_EVENT;

  const selectedDayEvents = selectedEvent
    ? events.filter((e) => isSameDay(new Date(e.startAt), new Date(selectedEvent.startAt)))
    : [];

  // Render month grid
  const renderMonthView = () => (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
      {/* Day-of-week headers */}
      <div className="grid shrink-0 grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {WEEKDAY_NAMES.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {monthDays.map((day, idx) => {
          const key = formatDate(day.date);
          const dayEvents = eventsByDate[key] || [];
          const isCurrentDay = isToday(day.date);
          const isSelected = selectedEvent && isSameDay(new Date(selectedEvent.startAt), day.date);
          const visibleEvents = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - 3;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (dayEvents.length > 0) setSelectedEvent(dayEvents[0]);
              }}
              className={`group relative flex flex-col border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                !day.isCurrentMonth ? "opacity-30" : ""
              } ${isCurrentDay ? "bg-brand-50/40 dark:bg-brand-900/20" : ""} ${
                isSelected ? "ring-2 ring-inset ring-brand-400" : ""
              }`}
            >
              <span
                className={`mb-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isCurrentDay
                    ? "bg-brand-900 text-white"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {day.date.getDate()}
              </span>

              <div className="mt-auto space-y-0.5">
                {visibleEvents.map((event) => {
                  const colors = EVENT_COLORS[event.type] || EVENT_COLORS.CALENDAR_EVENT;
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-1 rounded px-1 py-0.5 ${colors.bg} ${colors.text}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                      <span className="truncate text-[10px] font-medium leading-tight">
                        {event.title}
                      </span>
                    </div>
                  );
                })}
                {overflow > 0 ? (
                  <span className="block px-1 text-[10px] font-medium text-slate-400">
                    +{overflow} more
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render hour grid (shared by week & day views)
  const renderHourGrid = (days, labelFn) => (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900">
      {/* Day headers for week view */}
      <div
        className="grid shrink-0 border-b border-slate-100 dark:border-slate-800"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day, i) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={i}
              className={`px-2 py-2 text-center ${
                isCurrentDay ? "bg-brand-50/40 dark:bg-brand-900/20" : ""
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {labelFn ? labelFn(day) : WEEKDAY_NAMES[day.getDay()]}
              </div>
              <div
                className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                  isCurrentDay
                    ? "bg-brand-900 text-white"
                    : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable hour area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div
          className="relative"
          style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
        >
          {/* All-day events bar */}
          {(() => {
            const allEvents = days.flatMap((day) => eventsByHour(day).allDay);
            if (allEvents.length === 0) return null;
            return (
              <div
                className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
                style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
              >
                <div className="flex items-center justify-center border-r border-slate-100 text-[10px] font-medium text-slate-400 dark:border-slate-800">
                  All day
                </div>
                {days.map((day, i) => {
                  const { allDay } = eventsByHour(day);
                  return (
                    <div key={i} className="space-y-0.5 border-r border-slate-100 p-1 last:border-r-0 dark:border-slate-800">
                      {allDay.slice(0, 2).map((event) => {
                        const colors = EVENT_COLORS[event.type] || EVENT_COLORS.CALENDAR_EVENT;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className={`w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium leading-tight ${colors.bg} ${colors.text} hover:opacity-80`}
                          >
                            {event.title}
                          </button>
                        );
                      })}
                      {allDay.length > 2 ? (
                        <span className="block px-1 text-[10px] text-slate-400">+{allDay.length - 2} more</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Hour rows */}
          <div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative"
                style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Time label */}
                <div className="sticky left-0 z-10 flex items-start justify-center border-r border-b border-slate-100 bg-white pr-1 pt-0 dark:border-slate-800 dark:bg-slate-900">
                  <span className="-mt-2 whitespace-nowrap text-[10px] font-medium text-slate-400">
                    {formatHour(hour)}
                  </span>
                </div>

                {/* Day columns */}
                {days.map((day, i) => {
                  const { byHour } = eventsByHour(day);
                  const hourEvents = byHour[hour] || [];
                  const isCurrentDay = isToday(day);
                  const isPast =
                    day < new Date(new Date().setHours(0, 0, 0, 0));
                  const isNow =
                    isCurrentDay && hour === new Date().getHours();

                  return (
                    <div
                      key={i}
                      className={`relative border-r border-b border-slate-100 transition-colors last:border-r-0 dark:border-slate-800 ${
                        isCurrentDay
                          ? "bg-brand-50/20 dark:bg-brand-900/10"
                          : isPast
                            ? "bg-slate-50/50 dark:bg-slate-800/30"
                            : ""
                      } ${hoveredHour === hour ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                      style={{ height: HOUR_HEIGHT, minHeight: HOUR_HEIGHT }}
                    >
                      {/* Now indicator line */}
                      {isNow ? (
                        <div className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-rose-400">
                          <span className="-mt-2.5 ml-1 inline-block rounded-full bg-rose-400 px-1 text-[9px] font-bold text-white">
                            Now
                          </span>
                        </div>
                      ) : null}

                      {/* Events */}
                      {hourEvents.map((event) => {
                        const colors = EVENT_COLORS[event.type] || EVENT_COLORS.CALENDAR_EVENT;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className={`absolute left-0.5 right-0.5 z-10 flex items-start gap-1 overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight transition hover:opacity-90 ${colors.bg} ${colors.text}`}
                            style={{
                              top: 2,
                              height: HOUR_HEIGHT - 6,
                              borderLeftColor: colors.dot.replace("bg-", ""),
                            }}
                          >
                            <span className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                            <div className="min-w-0 flex-1">
                              <span className="truncate">{event.title}</span>
                              {event.startAt ? (
                                <span className="block text-[9px] opacity-70">
                                  {new Date(event.startAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <PageTransition className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black">Calendar</h1>
          {googleConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {calendarEmail ? (
                <span className="hidden sm:inline">{calendarEmail}</span>
              ) : (
                "Google Sync"
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Local Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {googleConnected ? (
            <button
              type="button"
              onClick={handleDisconnectGoogle}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
              title="Disconnect Google Calendar"
            >
              {disconnecting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <X size={12} />
              )}
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ExternalLink size={12} />
              )}
              Connect Google Calendar
            </button>
          )}
          <span className="text-xs text-slate-400">{totalEvents} events</span>
          <button
            type="button"
            onClick={loadEvents}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {/* Calendar Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goPrev}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight size={18} />
          </button>
          <h2 className="text-lg font-bold tabular-nums">{viewLabel}</h2>
        </div>

        {/* Employee filter — admin only */}
        {isAdmin && staffUsers.length > 0 ? (
          <div className="relative">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="">
                All Staff
              </option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Users
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        ) : null}

        {/* View toggle with icons */}
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
          {[
            { mode: "month", icon: Square, label: "Month" },
            { mode: "week", icon: Rows, label: "Week" },
            { mode: "day", icon: List, label: "Day" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                viewMode === mode
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid + Detail Panel */}
      <div
        ref={dragRef}
        className="flex flex-1 gap-4 overflow-hidden"
        style={{ touchAction: "pan-y" }}
        {...swipeHandlers}
      >
        {/* Calendar Grid — switches between month, week, day */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${viewLabel}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderHourGrid(weekDays, (d) => WEEKDAY_NAMES[d.getDay()])}
            {viewMode === "day" && renderHourGrid([dayDate], (d) => "Today")}
          </motion.div>
        </AnimatePresence>

        {/* Detail Panel */}
        <AnimatePresence mode="wait">
          {selectedEvent ? (
            <motion.div
              key={selectedEvent.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900"
            >
              <div className={`px-4 py-3 ${selectedEventColors.bg}`}>
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${selectedEventColors.bg} ${selectedEventColors.text}`}
                  >
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedEventColors.dot}`} />
                    {TYPE_LABELS[selectedEvent.type] || "Event"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="rounded-full p-1 text-slate-400 hover:bg-black/10"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                  {selectedEvent.title}
                </h3>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                  <CalendarIcon size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{formatDate(selectedEvent.startAt)}</p>
                    {!selectedEvent.allDay ? (
                      <p className="text-xs text-slate-400">
                        {formatDateTime(selectedEvent.startAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">All day</p>
                    )}
                  </div>
                </div>

                {selectedEvent.type === "TASK_DUE" && selectedEvent.payload ? (
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <ArrowUpRight size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {selectedEvent.payload.assignedTo?.name || "Unassigned"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedEvent.payload.client?.companyName || "No client"}
                      </p>
                    </div>
                  </div>
                ) : null}

                {selectedEvent.type === "COMPLIANCE_DUE" && selectedEvent.payload ? (
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <RefreshCw size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {selectedEvent.payload.type || "Compliance"}
                      </p>
                      {selectedEvent.recurrence && selectedEvent.recurrence !== "NONE" ? (
                        <p className="text-xs text-slate-400">
                          Recurring: {selectedEvent.recurrence}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {selectedEvent.googleMeetLink ? (
                  <a
                    href={selectedEvent.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
                  >
                    <Video size={14} />
                    Join Google Meet
                    <ExternalLink size={12} className="ml-auto" />
                  </a>
                ) : null}

                {selectedEvent.syncStatus ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        selectedEvent.syncStatus === "SYNCED"
                          ? "bg-emerald-500"
                          : selectedEvent.syncStatus === "FAILED"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                      }`}
                    />
                    {selectedEvent.syncStatus === "SYNCED"
                      ? "Synced with Google Calendar"
                      : selectedEvent.syncStatus === "FAILED"
                        ? "Sync failed"
                        : "Pending sync"}
                  </div>
                ) : null}

                {selectedEvent.googleSynced && !selectedEvent.syncStatus ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Google Calendar event created
                  </div>
                ) : null}
              </div>

              {selectedDayEvents.length > 1 ? (
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Other events on this day
                  </p>
                  <div className="space-y-1">
                    {selectedDayEvents
                      .filter((e) => e.id !== selectedEvent.id)
                      .slice(0, 4)
                      .map((event) => {
                        const colors = EVENT_COLORS[event.type] || EVENT_COLORS.CALENDAR_EVENT;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setSelectedEvent(event)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-slate-50 dark:hover:bg-slate-800 ${colors.text}`}
                          >
                            <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
                            <span className="truncate font-medium">{event.title}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="empty-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex w-72 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="text-center">
                <CalendarIcon size={24} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs text-slate-400">Select an event to view details</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
