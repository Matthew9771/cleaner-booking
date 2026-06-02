import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const { data } = await supabase.rpc("link_current_user_to_cleaner", {
    cleaner_email_input: user.email
  });

  if (data && typeof data === "object" && "linked" in data && data.linked) {
    redirect("/cleaner");
  }

  redirect("/dashboard");
}
