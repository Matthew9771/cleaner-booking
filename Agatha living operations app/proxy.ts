import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const publicPrefixes = [
  "/",
  "/login",
  "/logout",
  "/jobs/offer",
  "/jobs/complete",
  "/cleaner/invite",
  "/calendar/admin",
  "/calendar/cleaner"
];

const adminPrefixes = [
  "/dashboard",
  "/today",
  "/calendar",
  "/notifications",
  "/reminders",
  "/follow-ups",
  "/bookings",
  "/jobs",
  "/payments",
  "/supplies",
  "/maintenance",
  "/availability",
  "/reports",
  "/settings",
  "/deploy",
  "/setup",
  "/properties",
  "/cleaners"
];

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAdminPath(pathname: string) {
  return adminPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, approved_by_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.approved_by_admin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "Your account is waiting for admin approval.");
    return NextResponse.redirect(loginUrl);
  }

  const role = profile.role;

  if (pathname.startsWith("/cleaner") && role !== "cleaner") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAdminPath(pathname) && role === "cleaner") {
    return NextResponse.redirect(new URL("/cleaner", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)).*)"]
};
