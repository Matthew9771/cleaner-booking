import { createClient } from "@/lib/supabase/server";

type UpdatePropertyRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: UpdatePropertyRouteContext) {
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
  const address = String(formData.get("address") || "").trim();
  const bedroomsValue = String(formData.get("bedrooms") || "").trim();
  const bathroomsValue = String(formData.get("bathrooms") || "").trim();
  const bedrooms = bedroomsValue ? Number(bedroomsValue) : null;
  const bathrooms = bathroomsValue ? Number(bathroomsValue) : null;
  const checkOutTime = String(formData.get("check_out_time") || "").trim() || null;
  const checkInTime = String(formData.get("check_in_time") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (name && address) {
    await supabase
      .from("properties")
      .update({
        name,
        address,
        bedrooms: Number.isFinite(bedrooms) ? bedrooms : null,
        bathrooms: Number.isFinite(bathrooms) ? bathrooms : null,
        check_out_time: checkOutTime,
        check_in_time: checkInTime,
        notes
      })
      .eq("id", id);
  }

  return Response.redirect(new URL(`/properties/${id}`, request.url));
}
