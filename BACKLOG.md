# Agatha Living Operations App Backlog

## Come Back To

- Deploy the app so cleaner confirmation links work outside `localhost`.
- Set `NEXT_PUBLIC_APP_URL` to the live deployed URL after deployment.
- Add iCal import per property for Airbnb / Booking.com reservation feeds.
- Decide whether Google Calendar should also be connected for operations visibility.
- Add per-property iCal feed fields and sync status.
- Add automated reminders for jobs still in `offered` status.
- Add cleaner availability before assigning jobs.
- Add recurring cleaning rules per property.
- Add cleaner photo upload instead of manual photo confirmation.
- Add admin settings for default checkout time, check-in time, duration, and payment.

## Local App Links

- Dashboard: http://localhost:3001/dashboard
- Calendar: http://localhost:3001/calendar
- Add booking: http://localhost:3001/bookings/new
- Create cleaning job: http://localhost:3001/jobs/new
- Login: http://localhost:3001/login

## Supabase Migrations Already Used

- `20260529_public_cleaning_job_offers.sql`
- `20260529_cleaning_job_completion.sql`
- `20260529_bookings.sql`

## Important Notes

- Bookings are currently manual entry only.
- Cleaner confirmation links work locally for testing, but real cleaner phone links need deployment.
- iCal import is the recommended next integration for short-term rental bookings.
