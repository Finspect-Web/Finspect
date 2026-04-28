import { useCallback, useEffect, useMemo, useState } from "react";
import { getCalendarEvents } from "../api/calendarApi";
import { formatDate, formatDateTime } from "../utils/date";

function monthStartISO() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return start.toISOString().slice(0, 10);
}

function monthEndISO() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return end.toISOString().slice(0, 10);
}

const typeStyles = {
  TASK_DUE: "bg-brand-900 text-white",
  COMPLIANCE_DUE: "bg-teal-700 text-white",
  ATTENDANCE: "bg-amber-600 text-white",
  TIMESHEET: "bg-blue-700 text-white"
};

export default function CalendarPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(monthEndISO());
  const [events, setEvents] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const data = await getCalendarEvents({ from, to });
      setEvents(data.events || []);
      setTotalEvents(data.totalEvents || 0);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [from, to]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const grouped = useMemo(() => {
    return events.reduce((acc, event) => {
      const key = formatDate(event.startAt);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
  }, [events]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">Calendar</h1>
        <p className="text-sm text-slate-500">Total events: {totalEvents}</p>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
      </section>

      <section className="space-y-4">
        {Object.entries(grouped).map(([day, dayEvents]) => (
          <article
            key={day}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
          >
            <h2 className="text-lg font-bold">{day}</h2>
            <div className="mt-3 space-y-2">
              {dayEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{event.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeStyles[event.type] || "bg-slate-700 text-white"}`}>
                      {event.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.startAt)}</p>
                </div>
              ))}
            </div>
          </article>
        ))}

        {events.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            No calendar events found for selected range.
          </p>
        ) : null}
      </section>
    </div>
  );
}
