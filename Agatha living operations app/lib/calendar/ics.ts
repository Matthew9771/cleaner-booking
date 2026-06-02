type IcsJob = {
  id: string;
  job_date: string;
  status: string;
  payment_pence?: number | null;
  property_name?: string | null;
  property_address?: string | null;
  cleaner_name?: string | null;
  check_out_time?: string | null;
  check_in_time?: string | null;
};

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function compactTimestamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function dateTime(value: string, time?: string | null) {
  const cleanTime = time?.slice(0, 5) || "10:00";
  return `${value.replace(/-/g, "")}T${cleanTime.replace(":", "")}00`;
}

export function createCleaningJobsIcs({ title, jobs, baseUrl }: { title: string; jobs: IcsJob[]; baseUrl: string }) {
  const now = compactTimestamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agatha Living//Operations Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(title)}`,
    "X-WR-TIMEZONE:Europe/London"
  ];

  for (const job of jobs) {
    const summary = `${job.property_name || "Cleaning job"}${job.cleaner_name ? ` - ${job.cleaner_name}` : ""}`;
    const description = [
      `Status: ${job.status}`,
      job.payment_pence ? `Payment: £${(job.payment_pence / 100).toFixed(0)}` : "",
      job.property_address ? `Address: ${job.property_address}` : "",
      `${baseUrl.replace(/\/$/, "")}/jobs/${job.id}`
    ].filter(Boolean).join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:cleaning-job-${job.id}@agatha-living`,
      `DTSTAMP:${now}`,
      `DTSTART:${dateTime(job.job_date, job.check_out_time)}`,
      `DTEND:${dateTime(job.job_date, job.check_in_time || "15:00")}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `LOCATION:${escapeIcs(job.property_address || "")}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function icsResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
