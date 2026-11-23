# Hunter Family Dashboard

Wall-mounted family dashboard (Next.js), built for a 7th-gen iPad in landscape and hosted on Vercel.

- Calendar views: Week, Day, Month
- Widgets: Reminders, Meals, To get, Birthdays
- Currently running on sample data; real sources are wired up step by step

## Develop

```bash
npm install
npm run dev
```

## Sign-in (family passcode)

Set two environment variables in Vercel to turn the login on:

- `FAMILY_PASSCODE`: the passcode (at least 8 characters)
- `AUTH_SECRET`: a long random value, e.g. from `openssl rand -hex 32` (at least 32 characters)

Until both are set, only Vercel's own login protects the vercel.app address, and a custom domain refuses to open.
Changing either value signs every device out. Wrong tries are limited per device and overall.
