"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CalendarEvent = {
  uid?: string;
  summary?: string;
  description?: string;
  url?: string;
  start?: string;
  end?: string;
};

function unfoldIcalLines(value: string) {
  return value.replace(/\r?\n[ \t]/g, "");
}

function cleanIcalText(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function getIcalField(block: string, fieldName: string) {
  const line = block
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${fieldName}:`) || candidate.startsWith(`${fieldName};`));

  if (!line) return undefined;

  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) return undefined;

  return cleanIcalText(line.slice(colonIndex + 1));
}

function toDateOnly(value: string) {
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})/);

  if (!dateOnly) {
    return value.slice(0, 10);
  }

  return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
}

function parseIcalEvents(value: string) {
  const unfolded = unfoldIcalLines(value);
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  return blocks
    .map((block): CalendarEvent => ({
      uid: getIcalField(block, "UID"),
      summary: getIcalField(block, "SUMMARY"),
      description: getIcalField(block, "DESCRIPTION"),
      url: getIcalField(block, "URL"),
      start: getIcalField(block, "DTSTART"),
      end: getIcalField(block, "DTEND")
    }))
    .filter((event) => Boolean(event.start && event.end));
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function saveIcalFeed(propertyId: string, formData: FormData) {
  const { supabase } = await requireUser();
  const intent = String(formData.get("intent") || "save");
  const feedUrl = String(formData.get("ical_feed_url") || "").trim() || null;

  await supabase
    .from("properties")
    .update({
      ical_feed_url: feedUrl
    })
    .eq("id", propertyId);

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/ical`);

  if (intent === "save-and-sync" && feedUrl) {
    await syncIcalFeed(propertyId);
  }
}

async function importIcalBookings(propertyId: string, feedUrl: string, userId: string) {
  const response = await fetch(feedUrl, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Feed returned ${response.status}`);
  }

  const events = parseIcalEvents(await response.text());

  return events.map((event) => ({
    property_id: propertyId,
    guest_name: event.summary || "Imported booking",
    source: "iCal",
    check_in_date: toDateOnly(event.start as string),
    check_out_date: toDateOnly(event.end as string),
    notes: event.description || null,
    external_uid: event.uid || `${propertyId}-${toDateOnly(event.start as string)}-${toDateOnly(event.end as string)}`,
    external_url: event.url || feedUrl,
    created_by: userId
  }));
}

async function importAndRedirect(propertyId: string, feedUrl: string, userId: string) {
  const supabase = await createClient();
  let status = "synced";
  let message = "Sync complete.";

  try {
    const bookings = await importIcalBookings(propertyId, feedUrl, userId);
    const externalUids = bookings.map((booking) => booking.external_uid);
    let newCount = bookings.length;

    if (externalUids.length) {
      const { data: existingBookings, error: existingError } = await supabase
        .from("bookings")
        .select("external_uid")
        .in("external_uid", externalUids);

      if (existingError) {
        throw new Error(existingError.message);
      }

      const existingUids = new Set((existingBookings ?? []).map((booking) => booking.external_uid));
      newCount = bookings.filter((booking) => !existingUids.has(booking.external_uid)).length;

      const { error: upsertError } = await supabase.from("bookings").upsert(bookings, {
        onConflict: "external_uid",
        ignoreDuplicates: true
      });

      if (upsertError) {
        throw new Error(upsertError.message);
      }
    }

    const { error: syncError } = await supabase
      .from("properties")
      .update({
        ical_last_synced_at: new Date().toISOString()
      })
      .eq("id", propertyId);

    if (syncError) {
      throw new Error(syncError.message);
    }

    message =
      bookings.length === 0
        ? "Feed synced, but no bookings were found."
        : newCount === 0
          ? `Feed synced. ${bookings.length} bookings were already imported.`
          : `Imported ${newCount} new booking${newCount === 1 ? "" : "s"}.`;
  } catch (error) {
    status = "error";
    message = error instanceof Error ? `Sync failed: ${error.message}` : "Sync failed. Check the iCal URL and try again.";
  }

  revalidatePath("/dashboard");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath(`/properties/${propertyId}/ical`);
  redirect(`/properties/${propertyId}/ical?sync=${status}&message=${encodeURIComponent(message)}`);
}

export async function saveAndSyncIcalFeed(propertyId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const feedUrl = String(formData.get("ical_feed_url") || "").trim();

  if (!feedUrl) {
    redirect(`/properties/${propertyId}/ical?sync=missing&message=${encodeURIComponent("Paste an iCal URL before syncing.")}`);
  }

  await supabase
    .from("properties")
    .update({
      ical_feed_url: feedUrl
    })
    .eq("id", propertyId);

  await importAndRedirect(propertyId, feedUrl, user.id);
}

export async function syncIcalFeed(propertyId: string) {
  const { supabase, user } = await requireUser();
  const { data: property } = await supabase
    .from("properties")
    .select("id, ical_feed_url")
    .eq("id", propertyId)
    .single();

  if (!property?.ical_feed_url) {
    redirect(`/properties/${propertyId}/ical?sync=missing&message=${encodeURIComponent("Save an iCal URL before syncing.")}`);
  }

  await importAndRedirect(propertyId, property.ical_feed_url, user.id);
}
