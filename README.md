# UNILUS Student App

UNILUS student companion web app for campus navigation, timetable support, student chat,
and lecture room bookings.

## Central admin integration

This app connects to the UNILUS admin app through `lib/portal.ts`, which is the single
integration entrypoint used by server-side routes and booking services.

Required environment variables:

- `ADMIN_APP_URL` (for local development: `http://localhost:3001`)
- `STUDENT_APP_API_KEY` (must match the key configured on the admin app)

The integration key is never exposed to browser code. Browser requests go through this
app's internal API routes.

## Development

Use Node.js 20.9 or later.

```bash
npm ci
npm run dev
```

App URL: `http://localhost:3000`

## Validation and production launch

Run before deployment:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

Production:

```bash
npm start
```
