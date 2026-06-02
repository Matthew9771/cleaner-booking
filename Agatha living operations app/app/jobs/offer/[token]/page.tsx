import { notFound } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { respondToCleaningJobOffer } from "./actions";

type OfferPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    responded?: string;
  }>;
};

type PublicOffer = {
  id: string;
  status: string;
  job_date: string;
  duration_minutes: number;
  payment_pence: number;
  current_lockbox_code: string;
  new_lockbox_code: string;
  property_name: string;
  property_address: string;
  cleaner_name: string;
  completed_at?: string | null;
  cleaner_completed_at?: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function formatDuration(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} hours` : `${hours.toFixed(1)} hours`;
}

export default async function OfferPage({ params, searchParams }: OfferPageProps) {
  const { token } = await params;
  const { responded } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_cleaning_job_offer", {
    offer_token_input: token
  });

  if (!data) {
    notFound();
  }

  const offer = data as PublicOffer;
  const responseAction = respondToCleaningJobOffer.bind(null, token);
  const hasResponded = responded === "yes" || responded === "no" || ["accepted", "pending", "ready_for_review", "completed", "declined"].includes(offer.status);
  const canComplete = ["accepted", "pending", "ready_for_review", "completed"].includes(offer.status) || responded === "yes";
  const cleanerSubmitted = offer.status === "ready_for_review" || offer.status === "completed" || Boolean(offer.cleaner_completed_at);

  return (
    <main className="auth-shell">
      <section className="auth-panel offer-panel">
        <p className="eyebrow">Agatha Living</p>
        <h1>Cleaning job offer</h1>
        <p>
          {offer.cleaner_name ? `${offer.cleaner_name}, please confirm whether you can take this clean.` : "Please confirm whether you can take this clean."}
        </p>

        <div className="job-summary">
          <div>
            <span>Property</span>
            <strong>{offer.property_address}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{formatDate(offer.job_date)}</strong>
          </div>
          <div>
            <span>Timing</span>
            <strong>Checkout 11:00am, ready by 3:00pm</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{formatDuration(offer.duration_minutes)}</strong>
          </div>
          <div>
            <span>Payment</span>
            <strong>£{(offer.payment_pence / 100).toFixed(0)}</strong>
          </div>
          <div>
            <span>Lockbox</span>
            <strong>
              Change {offer.current_lockbox_code} to {offer.new_lockbox_code}
            </strong>
          </div>
        </div>

        {hasResponded ? (
          <div className="response-state">
            {canComplete ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            <strong>{canComplete ? "Confirmed. You are booked for this clean." : "Thanks for letting us know."}</strong>
          </div>
        ) : (
          <form action={responseAction} className="response-actions">
            <button className="button primary" name="response" type="submit" value="yes">
              <CheckCircle2 aria-hidden="true" />
              Yes, I can take it
            </button>
            <button className="button secondary" name="response" type="submit" value="no">
              <XCircle aria-hidden="true" />
              No, I cannot
            </button>
          </form>
        )}

        {canComplete ? (
          <Link className="button primary full-width completion-link" href={`/jobs/complete/${token}`}>
            <CheckCircle2 aria-hidden="true" />
            {cleanerSubmitted ? "View submitted clean" : "Submit clean after the job"}
          </Link>
        ) : null}
      </section>
    </main>
  );
}
