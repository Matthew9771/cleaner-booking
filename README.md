# cleaner-booking

## Netlify deployment

This site is deployed from the `Agatha living operations app` folder.

Use these Netlify build settings:

- Base directory: `Agatha living operations app`
- Build command: `npm run build`
- Publish directory: `.next`

The project uses `@netlify/plugin-nextjs`; keep it installed so Netlify serves
the app through the Next.js adapter instead of publishing `.next` as a static
folder.

Make production app changes in `Agatha living operations app`.
