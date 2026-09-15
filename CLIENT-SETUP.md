# Restaurant Direct: client setup

Superseded on 2026-09-15. The launch runbook is **[`docs/NEW-RESTAURANT.md`](docs/NEW-RESTAURANT.md)**,
and notification payloads are in [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md).

In short, a new restaurant is:

```bash
npm run new-tenant -- <slug> "Restaurant Name"   # scaffold config, sections, public/, server settings
npm run check-tenant -- <slug>                   # launch readiness: placeholders, photos, settings
npm run tenant:sql -- <slug>                     # generate the settings and menu SQL
```

plus a Supabase project built from `supabase/migrations/`, three n8n workflows, and a
Vercel project with `VITE_TENANT=<slug>`.
