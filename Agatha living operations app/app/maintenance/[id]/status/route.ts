import { createClient } from "@/lib/supabase/server";

type StatusRouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: StatusRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return Response.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const status = String(formData.get("status") || "open");

  await supabase
    .from("maintenance_tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);

  return Response.redirect(new URL("/maintenance", request.url));
}
