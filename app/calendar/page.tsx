import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminCalendarPicker } from "./admin-calendar-picker";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getCalendarMonth(month?: string) {
  const [yearValue, monthValue] = (month ?? "").split("-").map(Number);
  const now = new Date();
  const year = Number.isFinite(yearValue) && yearValue > 2000 ? yearValue : now.getFullYear();
  const monthIndex = Number.isFinite(monthValue) && monthValue >= 1 && monthValue <= 12 ? monthValue - 1 : now.getMonth();

  return new Date(year, monthIndex, 1);
}

function monthDays(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstGridDay = new Date(start);
  firstGridDay.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const cells: { date: string; inMonth: boolean }[] = [];

  for (let index = 0; index < 42; index += 1) {
    const value = new Date(firstGridDay);
    value.setDate(firstGridDay.getDate() + index);
    cells.push({
      date: dateKey(value.getFullYear(), value.getMonth(), value.getDate()),
      inMonth: value.getMonth() === monthDate.getMonth()
    });
  }

  return cells;
}

function monthParam(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function occupiedStayDates(checkIn: string, checkOut: string) {
  const dates: string[] = [];
  let current = checkIn;

  while (current < checkOut && dates.length < 90) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

type CalendarPageProps = {
  searchParams: Promise<{
    status?: string;
    month?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const { status = "open", month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const visibleMonth = getCalendarMonth(month);
  const days = monthDays(visibleMonth);
  const monthStart = dateKey(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = days[0]?.date ?? monthStart;
  const gridEnd = days[days.length - 1]?.date ?? dateKey(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from("cleaning_jobs")
    .select("id, job_date, status, payment_pence, cleaner_paid_at, properties(name, address), cleaners(name)")
    .gte("job_date", gridStart)
    .lte("job_date", gridEnd)
    .order("job_date", { ascending: true })
    .limit(120);
  if (status === "open") {
    query = query.in("status", ["draft", "offered", "accepted", "pending", "ready_for_review"]);
  } else if (status === "unpaid") {
    query = query.eq("status", "completed").is("cleaner_paid_at", null);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  const [{ data: jobs }, { data: unavailableDays }, { data: bookings }] = await Promise.all([
    query,
    supabase
      .from("cleaner_unavailability")
      .select("unavailable_date")
      .gte("unavailable_date", gridStart)
      .lte("unavailable_date", gridEnd),
    supabase
      .from("bookings")
      .select("id, check_in_date, check_out_date")
      .lte("check_in_date", gridEnd)
      .gte("check_out_date", gridStart)
      .limit(160)
  ]);
  const unavailableDates = new Set((unavailableDays ?? []).map((day) => day.unavailable_date));
  const occupiedDates = new Set<string>();

  for (const booking of bookings ?? []) {
    for (const date of occupiedStayDates(booking.check_in_date, booking.check_out_date)) {
      if (date >= gridStart && date <= gridEnd) {
        occupiedDates.add(date);
      }
    }
  }
  const calendarJobs = (jobs ?? []).map((job) => {
    const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
    const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;

    return {
      id: job.id,
      job_date: job.job_date,
      status: job.status,
      payment_pence: job.payment_pence,
      cleaner_paid_at: job.cleaner_paid_at,
      property_name: property?.name ?? "Property",
      property_address: property?.address ?? "No address",
      cleaner_name: cleaner?.name ?? "No cleaner"
    };
  });
  const filters = [
    ["open", "Open"],
    ["offered", "Awaiting cleaner"],
    ["pending", "Pending"],
    ["ready_for_review", "Review"],
    ["completed", "Completed"],
    ["unpaid", "Unpaid"],
    ["all", "All"]
  ];

  return (
    <main className="app-shell">
      <AdminNav active="calendar" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href="/dashboard">
            <ChevronLeft aria-hidden="true" />
            Dashboard
          </Link>
          <p className="eyebrow">Calendar</p>
          <h1>Upcoming jobs</h1>
        </div>
        <Link className="button primary" href="/jobs/new">
          New cleaning job
        </Link>
      </section>

      <section className="booking-style-calendar admin-calendar-shell">
        <div className="booking-calendar-top">
          <div>
            <p className="booking-calendar-property">Agatha Living</p>
            <h1>Operations calendar</h1>
            <p>Review cleans, cleaner availability, payments, and job status.</p>
            <div className="calendar-legend">
              <span><i className="legend-dot available-dot" />Active jobs</span>
              <span><i className="legend-dot selected-dot" />Needs review</span>
              <span><i className="legend-dot booked-dot" />Availability block</span>
            </div>
          </div>
          <Link className="calendar-clear-link" href="/calendar">This month</Link>
        </div>
        <div className="filter-tabs">
          {filters.map(([key, label]) => (
            <Link className={`filter-tab${status === key ? " active" : ""}`} href={`/calendar?status=${key}&month=${monthParam(visibleMonth)}`} key={key}>
              {label}
            </Link>
          ))}
        </div>
        <div className="booking-calendar-nav admin-calendar-nav">
          <Link className="calendar-pill-button" href={`/calendar?status=${status}&month=${monthParam(previousMonth)}`}>
            <ChevronLeft aria-hidden="true" />
            Prev
          </Link>
          <strong>{monthLabel(monthStart)}</strong>
          <Link className="calendar-pill-button" href={`/calendar?status=${status}&month=${monthParam(nextMonth)}`}>
            Next
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <AdminCalendarPicker
          days={days}
          initialDate={today}
          jobs={calendarJobs}
          monthLabel={monthLabel(monthStart)}
          occupiedDates={[...occupiedDates]}
          today={today}
          unavailableDates={[...unavailableDates]}
        />
      </section>
    </main>
  );
}
