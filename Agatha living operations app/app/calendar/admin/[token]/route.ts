import { createCleaningJobsIcs, icsResponse } from "@/lib/calendar/ics";
import { createClient } from "@/lib/supabase/server";

type AdminCalendarFeedContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: AdminCalendarFeedContext) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_admin_calendar_feed", {
    admin_token_input: token
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const body = createCleaningJobsIcs({
    title: "Agatha Living Operations",
    jobs: Array.isArray(data) ? data : [],
    baseUrl
  });

  return icsResponse(body, "agatha-living-admin-calendar.ics");
}
