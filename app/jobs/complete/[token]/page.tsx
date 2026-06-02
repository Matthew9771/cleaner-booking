import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { completePublicCleaningJob } from "./actions";

type CompletePublicJobPageProps = {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    completed?: string;
    error?: string;
  }>;
};

type PublicOffer = {
  status: string;
  job_date: string;
  current_lockbox_code: string;
  new_lockbox_code: string;
  completed_at?: string | null;
  cleaner_completed_at?: string | null;
  completion_notes?: string | null;
  before_photos_confirmed?: boolean | null;
  after_photos_confirmed?: boolean | null;
  property_address: string;
  cleaner_name: string;
  cleaning_checklist?: string[] | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

export default async function CompletePublicJobPage({ params, searchParams }: CompletePublicJobPageProps) {
  const { token } = await params;
  const { completed, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_cleaning_job_offer", {
    offer_token_input: token
  });

  if (!data) {
    notFound();
  }

  const offer = data as PublicOffer;
  const completeAction = completePublicCleaningJob.bind(null, token);
  const canSubmit = ["accepted", "pending", "ready_for_review", "completed"].includes(offer.status);
  const cleanerSubmitted = offer.status === "ready_for_review" || offer.status === "completed" || Boolean(offer.cleaner_completed_at);
  const checklistItems = offer.cleaning_checklist?.length ? offer.cleaning_checklist : ["Kitchen", "Living areas", "Bedrooms", "Bathrooms", "Hallway", "Lockbox changed"];

  return (
    <main className="auth-shell">
      <section className="auth-panel offer-panel">
        <Link className="back-link" href={`/jobs/offer/${token}`}>
          <ChevronLeft aria-hidden="true" />
          Job offer
        </Link>
        <p className="eyebrow">Agatha Living</p>
        <h1>Complete clean</h1>
        <p>
          {offer.cleaner_name ? `${offer.cleaner_name}, add the final details once this clean is done.` : "Add the final details once this clean is done."}
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
            <span>Lockbox</span>
            <strong>
              Change {offer.current_lockbox_code} to {offer.new_lockbox_code}
            </strong>
          </div>
        </div>

        {completed === "yes" || cleanerSubmitted ? (
          <div className="response-state">
            <CheckCircle2 aria-hidden="true" />
            <strong>Clean details sent to Agatha Living for review. Thank you.</strong>
          </div>
        ) : null}

        {canSubmit && !cleanerSubmitted ? (
          <form action={completeAction} className="data-form public-complete-form">
            {error === "photos" ? <p className="form-error">Please add at least one before photo and one after photo before sending.</p> : null}
            <label className="checkbox-label large">
              <input defaultChecked={Boolean(offer.before_photos_confirmed)} name="before_photos_confirmed" type="checkbox" />
              Before photos sent
            </label>
            <label>
              Before photos
              <input accept="image/*" multiple name="before_photos" required type="file" />
            </label>
            <div className="room-check-section">
              <p className="eyebrow">Before photos by area</p>
              <div className="tag-list room-checklist">
                {checklistItems.map((item) => <strong key={`before-${item}`}>{item}</strong>)}
              </div>
            </div>
            <label className="checkbox-label large">
              <input defaultChecked={Boolean(offer.after_photos_confirmed)} name="after_photos_confirmed" type="checkbox" />
              After photos sent
            </label>
            <label>
              After photos
              <input accept="image/*" multiple name="after_photos" required type="file" />
            </label>
            <div className="room-check-section">
              <p className="eyebrow">Room checklist</p>
              <div className="form-grid two">
                {checklistItems.map((item) => (
                  <label className="checkbox-label large" key={item}>
                    <input name="checklist_completed" required type="checkbox" value={item} />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <label>
              Notes for Agatha Living
              <textarea defaultValue={offer.completion_notes ?? ""} name="completion_notes" placeholder="Damage, missing items, supplies needed, access issues" rows={5} />
            </label>
            <button className="button primary" type="submit">
              <CheckCircle2 aria-hidden="true" />
              Send for review
            </button>
          </form>
        ) : null}

        {!canSubmit ? <p className="helper-text">This job needs to be confirmed before completion details can be sent.</p> : null}
      </section>
    </main>
  );
}
