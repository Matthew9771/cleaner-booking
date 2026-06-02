import { createClient } from "@/lib/supabase/server";

type QuickJobRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: QuickJobRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, check_out_date, guest_lockbox_code, properties(default_cleaner_id, default_duration_minutes, default_payment_pence, current_lockbox_code)")
    .eq("id", id)
    .single();

  const property = Array.isArray(booking?.properties) ? booking?.properties[0] : booking?.properties;

  if (!booking || !property?.default_cleaner_id || !property.current_lockbox_code || !booking.guest_lockbox_code) {
    return Response.redirect(new URL(`/bookings/${id}`, request.url));
  }

  const [{ data: bookingJobs }, { data: propertyJobs }, { data: cleanerJobs }] = await Promise.all([
    supabase.from("cleaning_jobs").select("id").eq("booking_id", booking.id).neq("status", "cancelled").limit(1),
    supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("property_id", booking.property_id)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1),
    supabase
      .from("cleaning_jobs")
      .select("id")
      .eq("cleaner_id", property.default_cleaner_id)
      .eq("job_date", booking.check_out_date)
      .neq("status", "cancelled")
      .limit(1)
  ]);

  if (bookingJobs?.[0] || propertyJobs?.[0] || cleanerJobs?.[0]) {
    return Response.redirect(new URL(`/bookings/${id}`, request.url));
  }

  const { data } = await supabase
    .from("cleaning_jobs")
    .insert({
      property_id: booking.property_id,
      booking_id: booking.id,
      cleaner_id: property.default_cleaner_id,
      job_date: booking.check_out_date,
      duration_minutes: property.default_duration_minutes ?? 180,
      payment_pence: property.default_payment_pence ?? 6000,
      current_lockbox_code: property.current_lockbox_code,
      new_lockbox_code: booking.guest_lockbox_code,
      status: "offered",
      offered_at: new Date().toISOString(),
      created_by: user.id
    })
    .select("id")
    .single();

  return Response.redirect(new URL(data?.id ? `/jobs/${data.id}` : `/bookings/${id}`, request.url));
}
