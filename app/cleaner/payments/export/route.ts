import { requireCleaner } from "@/lib/auth/roles";

export async function GET() {
  const { supabase, cleaner } = await requireCleaner();
  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("job_date, payment_pence, cleaner_paid_at, cleaner_invoice_number, properties(name, address)")
    .eq("cleaner_id", cleaner.id)
    .eq("status", "completed")
    .order("job_date", { ascending: false });
  const rows = [
    ["Invoice", "Date", "Property", "Address", "Amount", "Paid"],
    ...(jobs ?? []).map((job) => {
      const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
      return [
        job.cleaner_invoice_number ?? "",
        job.job_date,
        property?.name ?? "",
        property?.address ?? "",
        (job.payment_pence / 100).toFixed(2),
        job.cleaner_paid_at ? "Yes" : "No"
      ];
    })
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=agatha-living-cleaner-invoices.csv"
    }
  });
}
