import { createClient } from "@/lib/supabase/server";

type ResolveFollowUpRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: ResolveFollowUpRouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.redirect(new URL("/login", request.url));
  }

  await supabase
    .from("cleaning_jobs")
    .update({
      completion_issue_tags: []
    })
    .eq("id", id);

  return Response.redirect(new URL("/follow-ups", request.url));
}
