# DFML Tracker (scaffold)

Minimal scaffold for DFML Tracker.

Quick start:

```bash
cd D:\Documenti\VSCode\Progetti\dfml-tracker
npm install
npm run dev
```

Environment:
- `DATABASE_URL` for Postgres/Neon
- `NEXTAUTH_SECRET` and other auth envs when implementing Auth

Next steps:
- implement Drizzle schema in `src/db/schema.ts`
- add pages under `src/app`
