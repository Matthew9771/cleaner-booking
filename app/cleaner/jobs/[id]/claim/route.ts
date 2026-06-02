import { requireCleaner } from "@/lib/auth/roles";

type ClaimRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: ClaimRouteContext) {
  const { id } = await params;
  const { supabase, cleaner } = await requireCleaner();
  const { data: job } = await supabase.from("cleaning_jobs").select("job_date").eq("id", id).maybeSingle();

  if (job?.job_date) {
    const { data: unavailable } = await supabase
      .from("cleaner_unavailability")
      .select("id")
      .eq("cleaner_id", cleaner.id)
      .eq("unavailable_date", job.job_date)
      .maybeSingle();

    if (unavailable) {
      return Response.redirect(new URL("/cleaner/calendar", request.url));
    }
  }

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_id: cleaner.id,
      status: "pending",
      responded_at: new Date().toISOString()
    })
    .eq("id", id)
    .is("cleaner_id", null)
    .eq("status", "draft");

  return Response.redirect(new URL("/cleaner/calendar", request.url));
}
