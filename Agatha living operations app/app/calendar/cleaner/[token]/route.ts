import { createCleaningJobsIcs, icsResponse } from "@/lib/calendar/ics";
import { createClient } from "@/lib/supabase/server";

type CleanerCalendarFeedContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: CleanerCalendarFeedContext) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_cleaner_calendar_feed", {
    feed_token_input: token
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const body = createCleaningJobsIcs({
    title: "Agatha Living Cleaner Jobs",
    jobs: Array.isArray(data) ? data : [],
    baseUrl
  });

  return icsResponse(body, "agatha-living-cleaner-calendar.ics");
}
