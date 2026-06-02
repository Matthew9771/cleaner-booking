"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarDay = {
  date: string;
  inMonth: boolean;
};

type AdminCalendarJob = {
  id: string;
  job_date: string;
  status: string;
  payment_pence: number | null;
  cleaner_paid_at: string | null;
  property_name: string;
  property_address: string;
  cleaner_name: string;
};

type AdminCalendarPickerProps = {
  days: CalendarDay[];
  jobs: AdminCalendarJob[];
  unavailableDates: string[];
  occupiedDates: string[];
  today: string;
  initialDate: string;
  monthLabel: string;
};

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function weekdayLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(`${value}T12:00:00`));
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: "Draft",
    offered: "Awaiting cleaner",
    accepted: "Pending clean",
    pending: "Pending clean",
    ready_for_review: "Ready for review",
    completed: "Completed",
    declined: "Declined",
    cancelled: "Cancelled"
  };
  return labels[status] || status;
}

export function AdminCalendarPicker({ days, jobs, unavailableDates, occupiedDates, today, initialDate, monthLabel }: AdminCalendarPickerProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const occupiedSet = useMemo(() => new Set(occupiedDates), [occupiedDates]);
  const jobsByDay = useMemo(() => {
    const map = new Map<string, AdminCalendarJob[]>();

    for (const job of jobs) {
      map.set(job.job_date, [...(map.get(job.job_date) ?? []), job]);
    }

    return map;
  }, [jobs]);
  const selectedJobs = jobsByDay.get(selectedDate) ?? [];
  const nextJobs = jobs
    .filter((job) => job.job_date >= today)
    .sort((a, b) => a.job_date.localeCompare(b.job_date))
    .slice(0, 8);

  return (
    <>
      <div className="booking-calendar-board admin-booking-board">
        <div className="calendar-board-heading">
          <h2>{monthLabel}</h2>
          <span>{jobs.length} jobs · {occupiedDates.length} occupied nights</span>
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
            const isOccupied = occupiedSet.has(day.date);
            const hasReview = dayJobs.some((job) => job.status === "ready_for_review");
            const hasOpenJobs = dayJobs.some((job) => !["completed", "cancelled", "declined"].includes(job.status));
            const stateClass = hasReview ? "selected" : hasOpenJobs ? "available" : "booked";

            return (
              <button
                className={`booking-calendar-day admin-calendar-day ${stateClass}${isUnavailable || isOccupied ? " unavailable admin-unavailable" : ""}${selectedDate === day.date ? " focused" : ""}${!day.inMonth ? " muted" : ""}${day.date === today ? " today" : ""}`}
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                type="button"
              >
                <strong className={isUnavailable || isOccupied ? "unavailable-date-label" : undefined}>
                  <span>{dayLabel(day.date)}</span>
                  {isUnavailable || isOccupied ? <i aria-hidden="true" /> : null}
                </strong>
                <span>{weekdayLabel(day.date)}</span>
                <div className="booking-calendar-events">
                  {dayJobs.slice(0, 2).map((job) => (
                    <span className={`booking-calendar-chip calendar-status-${job.status}`} key={job.id}>
                      {job.property_name}
                    </span>
                  ))}
                  {dayJobs.length > 2 ? <span className="booking-calendar-chip booked">+{dayJobs.length - 2} more</span> : null}
                  {isOccupied ? <span className="booking-calendar-chip booked">Guest stay</span> : null}
                  {isUnavailable && !dayJobs.length ? <span className="booking-calendar-chip booked">Cleaner blocked</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="booking-calendar-agenda admin-calendar-agenda">
        <p className="eyebrow">Selected date</p>
        <div className="calendar-agenda-list">
          <div className={`agenda-item ${unavailableSet.has(selectedDate) || occupiedSet.has(selectedDate) ? "unavailable" : "assigned"}`}>
            <span>{weekdayLabel(selectedDate)} {dayLabel(selectedDate)}</span>
            <strong>{selectedJobs.length ? "Jobs on this date" : "No jobs scheduled"}</strong>
            <small>{occupiedSet.has(selectedDate) ? "A guest stay occupies this property date." : unavailableSet.has(selectedDate) ? "At least one cleaner has blocked this date." : "No cleaner availability blocks showing for this date."}</small>
          </div>
          {selectedJobs.map((job) => (
            <Link className={`agenda-item calendar-status-${job.status}`} href={job.status === "draft" ? `/jobs/${job.id}/reassign` : `/jobs/${job.id}`} key={job.id}>
              <span>{formatStatus(job.status)}</span>
              <strong>{job.property_name}</strong>
              <small>{job.cleaner_name} · {job.property_address}</small>
            </Link>
          ))}
        </div>

        <p className="eyebrow next-up-heading">Next up</p>
        <div className="calendar-agenda-list">
          {nextJobs.map((job) => (
            <Link className={`agenda-item calendar-status-${job.status}`} href={job.status === "draft" ? `/jobs/${job.id}/reassign` : `/jobs/${job.id}`} key={job.id}>
              <span>{dayLabel(job.job_date)} {weekdayLabel(job.job_date)} · {formatStatus(job.status)}</span>
              <strong>{job.property_name}</strong>
              <small>{job.cleaner_name}</small>
            </Link>
          ))}
          {!nextJobs.length ? <p className="booking-calendar-empty">No upcoming jobs showing for this filter.</p> : null}
        </div>
      </div>
    </>
  );
}
