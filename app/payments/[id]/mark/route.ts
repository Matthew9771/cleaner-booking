import { createClient } from "@/lib/supabase/server";

type MarkPaymentRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: MarkPaymentRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const paid = formData.get("paid") === "yes";

  await supabase
    .from("cleaning_jobs")
    .update({
      cleaner_paid_at: paid ? new Date().toISOString() : null
    })
    .eq("id", id);

  return Response.redirect(new URL("/payments", request.url));
}
