import { requireCleaner } from "@/lib/auth/roles";

type StartRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: StartRouteContext) {
  const { id } = await params;
  const { supabase, cleaner } = await requireCleaner();

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_started_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("cleaner_id", cleaner.id)
    .in("status", ["accepted", "pending"]);

  return Response.redirect(new URL(`/cleaner/jobs/${id}`, request.url));
}
