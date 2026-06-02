import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CleanerNav } from "../cleaner-nav";
import { CleanerCalendarPicker } from "./cleaner-calendar-picker";
import { requireCleaner } from "@/lib/auth/roles";

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

type CleanerCalendarPageProps = {
  searchParams: Promise<{
    month?: string;
    date?: string;
  }>;
};

export default async function CleanerCalendarPage({ searchParams }: CleanerCalendarPageProps) {
  const { month, date } = await searchParams;
  const { supabase, cleaner } = await requireCleaner();
  const visibleMonth = getCalendarMonth(month);
  const days = monthDays(visibleMonth);
  const monthStart = dateKey(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = days[0]?.date ?? monthStart;
  const gridEnd = days[days.length - 1]?.date ?? dateKey(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const previousMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: jobs }, { data: unavailableDays }, { data: cleanerSettings }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, job_date, status, payment_pence, public_offer_token, cleaner_id, properties(name, address)")
      .or(`cleaner_id.eq.${cleaner.id},and(cleaner_id.is.null,status.eq.draft)`)
      .gte("job_date", gridStart)
      .lte("job_date", gridEnd)
      .order("job_date", { ascending: true }),
    supabase
      .from("cleaner_unavailability")
      .select("unavailable_date, notes")
      .eq("cleaner_id", cleaner.id)
      .gte("unavailable_date", gridStart)
      .lte("unavailable_date", gridEnd),
    supabase
      .from("cleaners")
      .select("weekly_availability")
      .eq("id", cleaner.id)
      .maybeSingle()
  ]);
  const oneOffUnavailableDates = new Set((unavailableDays ?? []).map((day) => day.unavailable_date));
  const unavailableDates = new Set(oneOffUnavailableDates);
  const unavailableNotes = new Map((unavailableDays ?? []).map((day) => [day.unavailable_date, day.notes ?? "Unavailable"]));
  const weeklyAvailability = (cleanerSettings?.weekly_availability ?? {}) as Record<string, boolean>;
  const weekdayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  for (const day of days) {
    const weekdayKey = weekdayKeys[new Date(`${day.date}T12:00:00`).getDay()];
    if (weeklyAvailability[weekdayKey] === false) {
      unavailableDates.add(day.date);
    }
  }
  const selectedDate = date && days.some((day) => day.date === date) ? date : today;
  const calendarJobs = (jobs ?? []).map((job) => {
    const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;

    return {
      id: job.id,
      job_date: job.job_date,
      payment_pence: job.payment_pence,
      public_offer_token: job.public_offer_token,
      cleaner_id: job.cleaner_id,
      property_name: property?.name ?? "Property",
      property_address: property?.address ?? "No address"
    };
  });

  return (
    <main className="app-shell cleaner-shell">
      <CleanerNav active="calendar" cleanerName={cleaner.name} avatarUrl={cleaner.avatar_url} />
      <section className="booking-style-calendar">
        <div className="booking-calendar-top">
          <div>
            <p className="booking-calendar-property">Agatha Living</p>
            <h1>Pick your jobs</h1>
            <p>Select available cleans or open your assigned jobs.</p>
            <div className="calendar-legend">
              <span><i className="legend-dot available-dot" />Available</span>
              <span><i className="legend-dot selected-dot" />Your job</span>
              <span><i className="legend-dot booked-dot" />Unavailable</span>
            </div>
          </div>
          <Link className="calendar-clear-link" href="/cleaner/calendar">This month</Link>
        </div>

        <div className="booking-calendar-nav">
          <Link className="calendar-pill-button" href={`/cleaner/calendar?month=${monthParam(previousMonth)}`}>
            <ChevronLeft aria-hidden="true" />
            Prev
          </Link>
          <strong>{monthLabel(monthStart)}</strong>
          <Link className="calendar-pill-button" href={`/cleaner/calendar?month=${monthParam(nextMonth)}`}>
            Next
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>

        <CleanerCalendarPicker
          cleanerId={cleaner.id}
          days={days}
          initialDate={selectedDate}
          jobs={calendarJobs}
          month={monthParam(visibleMonth)}
          monthLabel={monthLabel(monthStart)}
          today={today}
          oneOffUnavailableDates={[...oneOffUnavailableDates]}
          unavailableDates={[...unavailableDates]}
          unavailableNotes={Object.fromEntries(unavailableNotes)}
          weeklyAvailability={weeklyAvailability}
        />
      </section>
    </main>
  );
}
