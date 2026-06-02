"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarDay = {
  date: string;
  inMonth: boolean;
};

type CalendarJob = {
  id: string;
  job_date: string;
  payment_pence: number;
  public_offer_token: string;
  cleaner_id: string | null;
  property_name: string;
  property_address: string;
};

type CleanerCalendarPickerProps = {
  days: CalendarDay[];
  jobs: CalendarJob[];
  unavailableDates: string[];
  cleanerId: string;
  today: string;
  initialDate: string;
  month: string;
  monthLabel: string;
  oneOffUnavailableDates: string[];
  unavailableNotes: Record<string, string>;
  weeklyAvailability: Record<string, boolean>;
};

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function fullWeekdayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(`${value}T12:00:00`));
}

function nextWeekdayLabel(dayIndex: number) {
  const todayDate = new Date();
  const date = new Date(todayDate);
  const diff = (dayIndex - todayDate.getDay() + 7) % 7;
  date.setDate(todayDate.getDate() + diff);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

export function CleanerCalendarPicker({ days, jobs, unavailableDates, cleanerId, today, initialDate, month, monthLabel, oneOffUnavailableDates, unavailableNotes, weeklyAvailability }: CleanerCalendarPickerProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const oneOffUnavailableSet = useMemo(() => new Set(oneOffUnavailableDates), [oneOffUnavailableDates]);
  const jobsByDay = useMemo(() => {
    const map = new Map<string, CalendarJob[]>();

    for (const job of jobs) {
      map.set(job.job_date, [...(map.get(job.job_date) ?? []), job]);
    }

    return map;
  }, [jobs]);
  const assignedJobs = jobs.filter((job) => job.cleaner_id === cleanerId);
  const availableJobs = jobs.filter((job) => !job.cleaner_id && !unavailableSet.has(job.job_date));
  const nextJobs = [...assignedJobs, ...availableJobs].sort((a, b) => a.job_date.localeCompare(b.job_date)).slice(0, 8);
  const selectedJobs = jobsByDay.get(selectedDate) ?? [];
  const selectedUnavailable = unavailableSet.has(selectedDate);
  const selectedOneOffUnavailable = oneOffUnavailableSet.has(selectedDate);
  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const selectedWeekdayIndex = new Date(`${selectedDate}T12:00:00`).getDay();
  const selectedWeekdayKey = weekdayKeys[selectedWeekdayIndex];
  const selectedWeeklyUnavailable = weeklyAvailability[selectedWeekdayKey] === false;
  const selectedUnavailableNote = selectedWeeklyUnavailable && !selectedOneOffUnavailable ? `${fullWeekdayLabel(selectedDate)} is blocked in your weekly availability.` : unavailableNotes[selectedDate] ?? "This day is blocked for you.";
  const weeklyItems = [
    ["weekly_monday", "monday", "Monday", 1],
    ["weekly_tuesday", "tuesday", "Tuesday", 2],
    ["weekly_wednesday", "wednesday", "Wednesday", 3],
    ["weekly_thursday", "thursday", "Thursday", 4],
    ["weekly_friday", "friday", "Friday", 5],
    ["weekly_saturday", "saturday", "Saturday", 6],
    ["weekly_sunday", "sunday", "Sunday", 0]
  ] as const;

  return (
    <>
      <div className="booking-calendar-board">
        <div className="calendar-board-heading">
          <h2>{monthLabel}</h2>
          <span>{assignedJobs.length} yours · {availableJobs.length} available</span>
        </div>
        <div className="booking-calendar-weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="booking-calendar-grid">
          {days.map((day) => {
            const dayJobs = jobsByDay.get(day.date) ?? [];
            const isUnavailable = unavailableSet.has(day.date);
            const hasAssigned = dayJobs.some((job) => job.cleaner_id === cleanerId);
            const hasAvailable = !isUnavailable && dayJobs.some((job) => !job.cleaner_id);
            const stateClass = hasAssigned ? "selected" : hasAvailable ? "available" : "booked";

            return (
              <button
                className={`booking-calendar-day ${stateClass}${isUnavailable ? " unavailable" : ""}${selectedDate === day.date ? " focused" : ""}${!day.inMonth ? " muted" : ""}${day.date === today ? " today" : ""}`}
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                type="button"
              >
                <strong className={isUnavailable ? "unavailable-date-label" : undefined}>
                  <span>{dayLabel(day.date)}</span>
                  {isUnavailable ? <i aria-hidden="true" /> : null}
                </strong>
                <span>{weekdayLabel(day.date)}</span>
                <div className="booking-calendar-events">
                  {isUnavailable ? <span className="booking-calendar-chip booked">Unavailable</span> : null}
                  {!isUnavailable ? dayJobs.slice(0, 2).map((job) => (
                    <span className={`booking-calendar-chip ${job.cleaner_id === cleanerId ? "selected" : "available"}`} key={job.id}>
                      {job.property_name}
                    </span>
                  )) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="booking-calendar-agenda" id="book-days-off">
        <p className="eyebrow">Selected date</p>
        <div className="calendar-agenda-list">
          <div className={`agenda-item ${selectedUnavailable ? "unavailable" : "assigned"}`}>
            <span>{weekdayLabel(selectedDate)} {dayLabel(selectedDate)}</span>
            <strong>{selectedUnavailable ? "You are unavailable" : selectedJobs.length ? "Jobs on this date" : "No jobs showing"}</strong>
            <small>{selectedUnavailable ? selectedUnavailableNote : selectedJobs.length ? `${selectedJobs.length} job${selectedJobs.length === 1 ? "" : "s"} found` : "Tap another date or check the next available jobs below."}</small>
          </div>
          <form action="/cleaner/calendar/unavailable" className="agenda-item unavailable-control" method="post">
            <input name="date" type="hidden" value={selectedDate} />
            <input name="month" type="hidden" value={month} />
            {selectedOneOffUnavailable ? (
              <>
                <input name="action" type="hidden" value="remove" />
                <span>Availability</span>
                <strong>Make this date available again</strong>
                <button className="mini-button" type="submit">Remove block</button>
              </>
            ) : selectedWeeklyUnavailable ? (
              <>
                <input name="action" type="hidden" value="add" />
                <span>Availability</span>
                <strong>This is blocked by weekly availability</strong>
                <small>Use Your availability below to make {fullWeekdayLabel(selectedDate)} available again.</small>
              </>
            ) : (
              <>
                <input name="action" type="hidden" value="add" />
                <span>Availability</span>
                <strong>Block this selected date</strong>
                <input name="notes" placeholder="Optional note" type="text" />
                <button className="mini-button" type="submit">Mark unavailable</button>
              </>
            )}
          </form>
          {!selectedUnavailable ? selectedJobs.map((job) => {
            const assigned = job.cleaner_id === cleanerId;

            return assigned ? (
              <Link className="agenda-item assigned" href={`/cleaner/jobs/${job.id}`} key={job.id}>
                <span>Your job</span>
                <strong>{job.property_name}</strong>
                <small>{job.property_address}</small>
              </Link>
            ) : (
              <form action={`/cleaner/jobs/${job.id}/claim`} className="agenda-item available" key={job.id} method="post">
                <span>Available</span>
                <strong>{job.property_name}</strong>
                <small>£{(job.payment_pence / 100).toFixed(0)}</small>
                <button className="mini-button" type="submit">Pick job</button>
              </form>
            );
          }) : null}
        </div>

        <div className="calendar-agenda-list availability-settings" id="availability">
          <form action="/cleaner/calendar/weekly" className="agenda-item availability-form" method="post">
            <input name="date" type="hidden" value={selectedDate} />
            <input name="month" type="hidden" value={month} />
            <span>Your availability</span>
            <strong>Weekly availability</strong>
            <div className="form-grid two">
              {weeklyItems.map(([name, key, label, dayIndex]) => (
                <label className="checkbox-label large" key={key}>
                  <input defaultChecked={weeklyAvailability[key] !== false} name={name} type="checkbox" />
                  {label} <small>{nextWeekdayLabel(dayIndex)}</small>
                </label>
              ))}
            </div>
            <button className="mini-button" type="submit">Save weekly availability</button>
          </form>
        </div>

        <p className="eyebrow next-up-heading">Next up</p>
        <div className="calendar-agenda-list">
          {nextJobs.map((job) => {
            const assigned = job.cleaner_id === cleanerId;
            return (
              <Link className={`agenda-item ${assigned ? "assigned" : "available"}`} href={assigned ? `/cleaner/jobs/${job.id}` : `/jobs/offer/${job.public_offer_token}`} key={job.id}>
                <span>{dayLabel(job.job_date)} {weekdayLabel(job.job_date)}</span>
                <strong>{job.property_name}</strong>
                <small>{assigned ? "Your job" : `Available £${(job.payment_pence / 100).toFixed(0)}`}</small>
              </Link>
            );
          })}
          {!nextJobs.length ? <p className="booking-calendar-empty">No jobs showing this month.</p> : null}
        </div>
      </div>
    </>
  );
}
