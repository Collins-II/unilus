# UNILUS Student App

UNILUS student companion web app for campus navigation, timetable support, student chat,
lecture room bookings, and programme-assigned quizzes, tests and exams.

The map-first home includes a searchable, mobile-friendly campus places panel and
campus switching. Programme, department, campus and year assignments are managed by
administrators; students can update their contact details.

## UNILUS campus map scopes

The [official campus list](https://web.unilus.ac.zm/contact-us/) includes three campuses:

| Campus | Map scope |
| --- | --- |
| Silverest | Community OpenStreetMap [outline](https://www.openstreetmap.org/way/1558103619), centred at -15.3554635, 28.4691588 |
| Massmedia | **Approximate Alick Nkhata Road viewing area**, centred on the road at -15.4102855, 28.3201885; not a verified campus pin or boundary. Official address: Plot 37413, Alick Nkhata Road |
| Leopards Hill | Community OpenStreetMap [outline](https://www.openstreetmap.org/way/842714813), centred at -15.4535623, 28.3795288 |

Outline data was retrieved on 2026-11-05 and is copyright OpenStreetMap contributors,
licensed under [ODbL](https://www.openstreetmap.org/copyright). It is navigation data,
not a cadastral survey. Massmedia's approved viewing extent is latitude
-15.416 to -15.405 and longitude 28.314 to 28.326; no campus polygon is invented.
Both map and places panel label its uncertainty. Staff must confirm actual room
coordinates before students rely on navigation.

Keep `lib/campus-geography.ts` synchronized with the portal's
`lib/campus/geography.ts`. UNZA campus outlines are deliberately excluded.

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

Local development is HTTP, not `https://localhost:3000`. Use HTTPS for production.

## Validation and production launch

Run before deployment:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm audit --omit=dev`

Both applications must use the identical MongoDB database and integration key,
different authentication secrets, and a transaction-capable MongoDB deployment.
Configure the staff-managed programme catalogue before enabling registration.
Unknown legacy programme assignments are not guessed or silently reassigned.

Published in-person assessments reserve rooms alongside bookings and teaching
allocations. Online assessment deadlines and attempts are enforced by the admin
server; saved answers cannot be edited after submission and scores are released
after the assessment window closes.

Before launch, populate and verify official departments, courses, programmes,
campus room coordinates and published schedules. Exercise staff publication,
student registration/sign-in, booking approvals/cancellation, assessment attempts
and mobile navigation using temporary fixtures or a staging database.
Do not use fabricated academic records as production data.

The serializer override patches the inherited PWA serializer advisories; the
PWA type package uses the same patched Next.js as the application instead of
installing obsolete Next.js 13. The remaining runtime audit reports five low
advisories in `deepmerge` and its PWA build-chain dependants.
Do not run `npm audit fix --force`: its suggested PWA downgrade is breaking.
Review the remaining PWA toolchain advisories before release. Repeat the audit and
production build whenever dependencies change.

Production:

```bash
npm start
```
