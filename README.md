# StudyTrack

StudyTrack is a responsive student academic management workspace built with React, TypeScript, Tailwind CSS, Express, and Supabase.

## Start the development preview

```bash
corepack pnpm install
corepack pnpm dev
```

The Express/Vite development server listens on port 3000 (or the platform-provided `PORT`). The browser obtains only `SUPABASE_URL` and `SUPABASE_ANON_KEY` from `/api/public-config`; never configure a service-role key in the browser.

## Connect Supabase

Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as protected project environment values, then follow [`supabase/README.md`](./supabase/README.md). Apply `supabase/migrations/001_studytrack.sql` in Supabase SQL Editor to create the normalized tables and RLS policies. For evaluation records, also apply `002_studytrack_sample_data.sql`; it defines an authenticated RPC that inserts data only after the user chooses **Settings → Load sample data** while their workspace is empty.

The demo is opt-in, account-scoped, and editable. Dashboard metrics and charts use Supabase data. No AI features or auto-generated study schedules are included.
