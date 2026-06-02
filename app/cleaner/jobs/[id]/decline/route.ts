import { requireCleaner } from "@/lib/auth/roles";

type DeclineRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: DeclineRouteContext) {
  const { id } = await params;
  const { supabase, cleaner } = await requireCleaner();

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_id: null,
      status: "draft",
      responded_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("cleaner_id", cleaner.id)
    .in("status", ["accepted", "pending"]);

  return Response.redirect(new URL("/cleaner/jobs", request.url));
}
