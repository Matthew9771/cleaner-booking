import { createClient } from "@/lib/supabase/server";

type UpdateCleanerRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: UpdateCleanerRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const isPrimary = formData.get("is_primary") === "on";
  const active = formData.get("active") === "on";
  const canLogin = formData.get("can_login") === "on" && Boolean(email);
  const preferredAreas = String(formData.get("preferred_areas") || "").trim() || null;
  const availabilityNotes = String(formData.get("availability_notes") || "").trim() || null;

  if (name && phone) {
    await supabase
      .from("cleaners")
      .update({
        name,
        phone,
        email,
        can_login: canLogin,
        is_primary: isPrimary,
        active,
        preferred_areas: preferredAreas,
        availability_notes: availabilityNotes
      })
      .eq("id", id);
  }

  return Response.redirect(new URL(`/cleaners/${id}`, request.url));
}
