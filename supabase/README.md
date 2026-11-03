# Supabase setup for StudyTrack

1. Create or select a Supabase project.
2. In the Supabase Dashboard, open **SQL Editor** and run `migrations/001_studytrack.sql`. This creates the nine application tables, relational constraints, indexes, update timestamps, and account-owner RLS policies.
3. If you want the evaluation dataset, also run `migrations/002_studytrack_sample_data.sql`. This defines a signed-in-only RPC; it does not insert any data until the user explicitly chooses **Settings → Load sample data**. It refuses to seed a workspace containing any StudyTrack rows and creates all sample records in one transaction.
4. In StudyTrack's protected project settings, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` using the Supabase project URL and public anon/publishable key. Never use `service_role` in the browser or as `SUPABASE_ANON_KEY`.
5. Reload the app and register an account. New records are scoped to that signed-in account by database RLS.

The public key is intentionally used by the Supabase browser client; row-level security is the access boundary. Applying schema DDL remains an owner action in the Supabase SQL Editor because the application must not receive a database-admin key.
