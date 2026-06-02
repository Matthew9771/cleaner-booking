import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { AdminNav } from "@/app/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { completeCleaningJob } from "../actions";

type CompleteJobPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function plural(value: number, single: string, multiple: string) {
  return value === 1 ? single : multiple;
}

function formatRoomCount(value: number | string | null | undefined, label: string) {
  if (value === null || value === undefined || value === "") {
    return `All ${label}s`;
  }

  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return `${value} ${label}s`;
  }

  return `${numericValue} ${plural(numericValue, label, `${label}s`)}`;
}

export default async function CompleteJobPage({ params }: CompleteJobPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("id, status, current_lockbox_code, new_lockbox_code, before_photos_confirmed, after_photos_confirmed, before_photo_paths, after_photo_paths, checklist_completed, completion_notes, completion_issue_tags, admin_review_notes, admin_quality_rating, admin_quality_notes, cleaner_started_at, cleaner_completed_at, properties(name, address, bedrooms, bathrooms, cleaning_notes, cleaning_checklist), cleaners(name)")
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  const property = Array.isArray(job.properties) ? job.properties[0] : job.properties;
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  const completeAction = completeCleaningJob.bind(null, id);
  const beforePaths = (job.before_photo_paths ?? []) as string[];
  const afterPaths = (job.after_photo_paths ?? []) as string[];
  const { data: beforeSignedPhotos } = beforePaths.length
    ? await supabase.storage.from("cleaning-photos").createSignedUrls(beforePaths, 60 * 60)
    : { data: [] };
  const { data: afterSignedPhotos } = afterPaths.length
    ? await supabase.storage.from("cleaning-photos").createSignedUrls(afterPaths, 60 * 60)
    : { data: [] };
  const roomChecklist = [
    "Kitchen",
    "Living areas",
    formatRoomCount(property?.bedrooms, "bedroom"),
    formatRoomCount(property?.bathrooms, "bathroom"),
    "Hallway",
    "Lockbox before and after"
  ];
  const completedChecklist = (job.checklist_completed ?? []) as string[];
  const photoChecklist = (property?.cleaning_checklist?.length ? property.cleaning_checklist : roomChecklist) as string[];
  const beforePhotoLinks = (beforeSignedPhotos ?? [])
    .filter((photo) => Boolean(photo.path && photo.signedUrl))
    .map((photo) => ({ path: photo.path as string, signedUrl: photo.signedUrl as string }));
  const afterPhotoLinks = (afterSignedPhotos ?? [])
    .filter((photo) => Boolean(photo.path && photo.signedUrl))
    .map((photo) => ({ path: photo.path as string, signedUrl: photo.signedUrl as string }));

  return (
    <main className="app-shell">
      <AdminNav active="job" />
      <section className="dashboard-header compact">
        <div>
          <Link className="back-link" href={`/jobs/${id}`}>
            <ChevronLeft aria-hidden="true" />
            Job
          </Link>
          <p className="eyebrow">Completion</p>
          <h1>Verify clean</h1>
          <p className="intro">
            {property?.name ?? "Property"} with {cleaner?.name ?? "cleaner"}
          </p>
        </div>
      </section>

      <section className="job-layout single">
        <form action={completeAction} className="management-panel data-form">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Internal checklist</p>
              <h2>Before marking complete</h2>
            </div>
            <CheckCircle2 aria-hidden="true" />
          </div>
          <div className="job-summary">
            <div>
              <span>Lockbox</span>
              <strong>
                Change {job.current_lockbox_code || "current code"} to {job.new_lockbox_code || "new guest code"}
              </strong>
            </div>
            <div>
              <span>Property notes</span>
              <strong>{property?.cleaning_notes || "No property cleaning notes"}</strong>
            </div>
            <div>
              <span>Photo checklist</span>
              <div className="tag-list room-checklist">
                {photoChecklist.map((room) => (
                  <strong className={completedChecklist.includes(room) ? "complete-tag" : ""} key={room}>{room}</strong>
                ))}
              </div>
            </div>
            <div>
              <span>Cleaner started</span>
              <strong>{job.cleaner_started_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(job.cleaner_started_at)) : "Not started in app"}</strong>
            </div>
            <div>
              <span>Uploaded photos</span>
              <strong>
                {beforePaths.length} before, {afterPaths.length} after
              </strong>
            </div>
            <div>
              <span>Follow up</span>
              <strong>Damage, low supplies, access issues, or guest notes</strong>
            </div>
          </div>
          <label className="checkbox-label large">
            <input defaultChecked={job.before_photos_confirmed} name="before_photos_confirmed" type="checkbox" />
            Before photos received
          </label>
          <label className="checkbox-label large">
            <input defaultChecked={job.after_photos_confirmed} name="after_photos_confirmed" type="checkbox" />
            After photos received
          </label>
          <div className="photo-review-grid">
            <div>
              <p className="eyebrow">Before photos</p>
              <div className="photo-link-list">
                {beforePhotoLinks.map((photo, index) => (
                  <a className="photo-link photo-thumb-link" href={photo.signedUrl} key={photo.path} rel="noreferrer" target="_blank">
                    <Image alt={`Before clean photo ${index + 1}`} height={74} src={photo.signedUrl} unoptimized width={104} />
                    <span>Open before photo {index + 1}</span>
                  </a>
                ))}
                {!beforePhotoLinks.length ? <p className="empty-state">No before photos uploaded.</p> : null}
              </div>
            </div>
            <div>
              <p className="eyebrow">After photos</p>
              <div className="photo-link-list">
                {afterPhotoLinks.map((photo, index) => (
                  <a className="photo-link photo-thumb-link" href={photo.signedUrl} key={photo.path} rel="noreferrer" target="_blank">
                    <Image alt={`After clean photo ${index + 1}`} height={74} src={photo.signedUrl} unoptimized width={104} />
                    <span>Open after photo {index + 1}</span>
                  </a>
                ))}
                {!afterPhotoLinks.length ? <p className="empty-state">No after photos uploaded.</p> : null}
              </div>
            </div>
          </div>
          <label>
            Completion notes
            <textarea defaultValue={job.completion_notes ?? ""} name="completion_notes" placeholder="Anything to follow up, damage, missing supplies, guest notes" rows={5} />
          </label>
          <div className="form-grid two">
            {[
              ["supplies", "Supplies needed"],
              ["damage", "Damage"],
              ["maintenance", "Maintenance"],
              ["guest_issue", "Guest issue"]
            ].map(([value, label]) => (
              <label className="checkbox-label large" key={value}>
                <input defaultChecked={Boolean(job.completion_issue_tags?.includes(value))} name="completion_issue_tags" type="checkbox" value={value} />
                {label}
              </label>
            ))}
          </div>
          <label>
            Admin review notes
            <textarea defaultValue={job.admin_review_notes ?? ""} name="admin_review_notes" placeholder="What did you verify or what needs follow-up?" rows={4} />
          </label>
          <label>
            Quality rating
            <select defaultValue={job.admin_quality_rating ?? ""} name="admin_quality_rating">
              <option value="">Choose rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Needs small follow-up</option>
              <option value="2">2 - Needs retraining</option>
              <option value="1">1 - Serious issue</option>
            </select>
          </label>
          <label>
            Quality notes
            <textarea defaultValue={job.admin_quality_notes ?? ""} name="admin_quality_notes" placeholder="Private cleaner performance notes" rows={3} />
          </label>
          <p className="helper-text">
            Only verify once the cleaner has submitted the clean. This will update the property&apos;s current lockbox code to {job.new_lockbox_code || "the new guest code"}.
          </p>
          <button className="button primary" disabled={job.status !== "ready_for_review"} type="submit">
            <CheckCircle2 aria-hidden="true" />
            Verify and mark complete
          </button>
          {job.status !== "ready_for_review" ? <p className="helper-text">Waiting for the cleaner to submit completion details.</p> : null}
        </form>
      </section>
    </main>
  );
}
