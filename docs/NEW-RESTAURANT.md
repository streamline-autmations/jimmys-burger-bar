# Launching a new restaurant on Restaurant Direct

The whole product (site, ordering, bookings, tracking, staff console, emails) is one
codebase. A restaurant is a folder of config and photos, a Supabase project, a set of n8n
workflows and a Vercel project. This is the order to set them up in.

Budget roughly: **half a day** of setup below, plus the **design pass** for the client's
own look, plus however long the client takes to send real content.

Throughout, `<slug>` is the restaurant's short id (lowercase, hyphens), e.g. `rosies-diner`.

---

## 0. Get the real content first

Nothing on a live restaurant site is invented (see `CLAUDE.md`). Collect before starting:

- Logo (transparent PNG or SVG), favicon, brand colours and fonts
- The full menu with every price, and which items stop at a set time (e.g. breakfast until 12)
- Trading hours per day, and known closures
- Phone, WhatsApp number, email, street address
- Google Maps embed link, Google review link, and the **current** rating and review count
- Facebook and Instagram links
- Photos of **their own** food, venue and team
- Real reviews to quote word for word, if any
- Collection, delivery and table service: which they actually offer
- Two or three letters for order references (Jimmy's uses `JB`)
- Who receives order and booking emails, and the email address guests should see

Missing something? Leave the `PLACEHOLDER` in place and ask. `check-tenant` will not pass
until it is filled.

## 1. Scaffold the restaurant

```bash
git checkout master && git pull
git checkout -b tenant/<slug>
npm run new-tenant -- <slug> "Restaurant Name"
```

This creates:

| Path | What goes in it |
|---|---|
| `src/tenants/<slug>/config.ts` | Brand, contact, hours, menu, page words |
| `src/tenants/<slug>/sections.ts` | The home page, top to bottom |
| `src/tenants/<slug>/public/` | Every photo, video, logo and favicon, served from the site root |
| `supabase/tenants/<slug>.json` | Supabase project, webhooks, review email time |

and registers the restaurant in `src/config.ts`.

Fill in the config and drop the files into `public/`, then run it:

```bash
VITE_TENANT=<slug> CHOKIDAR_USEPOLLING=true npm run dev
npm run check-tenant -- <slug>     # repeat until it passes
```

## 2. Design pass

The template reuses Jimmy's section designs with placeholder words. That is a starting
point, not the client's look. Run the design process from the global instructions
(art direction first) and adapt or add section components in `src/brand/sections/`.

Two things to know:

- The **`hero` section is Jimmy's burger build**. It needs five layered burger images in
  `public/images/burger-layers/`. Without that artwork, write a different hero section.
- Verify in a browser at **1440px and 390px** before calling it done.

## 3. Supabase project

1. **Create the project** in the Streamline Supabase organisation. Region: closest to the
   restaurant (Africa: `eu-west-2` or `eu-central-1`). Put the project ref in
   `supabase/tenants/<slug>.json`.
2. **Build the database.** SQL editor → paste and run
   `supabase/migrations/20260915000000_restaurant_direct_baseline.sql`, then any newer files
   in `supabase/migrations/`, in name order.
3. **Confirm it matches.** Run `supabase/snapshot/compare.sql`. It must return **zero rows**.
4. **Authentication settings:**
   - Sign In / Providers → Email → **turn off "Allow new users to sign up"**. RLS trusts
     the staff list, but a stranger with an account is still a stranger with an account.
   - Password security → **turn on leaked password protection**.
5. **Settings and menu.** Leave the webhooks `null` for now (step 4 fills them in), then:
   ```bash
   npm run tenant:sql -- <slug>
   ```
   Run `supabase/seed/settings.<slug>.sql`, then `supabase/seed/menu.<slug>.sql`, in the SQL editor.
6. **Owner login.** Authentication → Users → **Add user** with the owner's email, a strong
   password, and "Auto confirm" on. Then in the SQL editor:
   ```sql
   insert into public.staff (user_id, email, role)
   select id, email, 'owner' from auth.users where email = 'owner@their-domain.co.za';
   ```
   The owner turns on two-factor sign-in themselves from **Security** in the staff console.
7. **Health check.** Run `supabase/verify.sql`. Every row should be `ok = true` except the
   webhook rows until step 4 is done.

## 4. Email notifications (n8n)

Notifications go through the shared n8n instance. Payloads and pitfalls are in
[`docs/NOTIFICATIONS.md`](NOTIFICATIONS.md).

1. Duplicate Jimmy's three workflows ("Jimmy's — Order Notifications", "Booking
   Notifications", "Review Request") and rename them for the restaurant.
2. In each: change the webhook path (e.g. `/webhook/<slug>-order`), the recipient, the
   display name, the colours and the staff-console link. Keep the SMTP credential.
3. Activate them, then put the production webhook URLs in `supabase/tenants/<slug>.json`,
   with `reviewRequests.localTime` (e.g. `"20:00"`) if they want review emails.
4. `npm run tenant:sql -- <slug>`, re-run `settings.<slug>.sql`, re-run `verify.sql`.

## 5. Vercel project

1. New Project → import `streamline-autmations/jimmys-burger-bar` → name it `<slug>`.
2. Leave Build Command (`npm run build`) and Output Directory (`dist`) at their defaults.
3. Environment variables (Production and Preview):

   | Name | Value |
   |---|---|
   | `VITE_TENANT` | `<slug>` |
   | `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API → the **publishable / anon** key. Never the service role key. |

   Vite bakes these in at build time. A missing variable does not fail the build; it ships
   a site that cannot take orders.
4. Once live, add the client's domain.

**Every restaurant builds from the same repo.** A push to `master` redeploys all of them,
Jimmy's and the sales demo included, so merge a tenant's branch only when it is ready.

## 6. Before telling the client it is live

- [ ] `npm run check-tenant -- <slug>` passes
- [ ] `npm test` and `npm run build` pass
- [ ] Browser pass at 1440px and 390px: home, menu, order, booking, track, staff console
- [ ] `supabase/snapshot/compare.sql` → zero rows; `supabase/verify.sql` → all ok
- [ ] Place one real test order and one booking on the live site. Check both emails arrive,
      the order appears in the staff console, and it moves through every status. Then delete
      the test rows (SQL editor, as the project owner).
- [ ] The owner can sign in, and has turned on two-factor sign-in
- [ ] Public sign-up is off and leaked password protection is on

## Afterwards: changing the menu or prices

1. Edit `src/tenants/<slug>/config.ts`.
2. `npm run tenant:sql -- <slug>`, commit.
3. Run the new `menu.<slug>.sql` in the SQL editor **and deploy straight after**. In between,
   orders for a changed item are refused with "the menu has changed", so do it outside service.

## Afterwards: changing the database

Add a new timestamped file in `supabase/migrations/`, apply it to **every** restaurant's
project, run `npm run db:fingerprint`, commit, and check each project with `compare.sql`.

## Known limits

- **Review emails use UTC dates.** The nightly job picks "today's" completed orders by UTC
  date, and compares booking times in UTC. For South Africa (UTC+2) the effect is small. A
  restaurant far from UTC needs a migration to make it zone-aware first.
- **Booking spam limits are fixed:** 3 requests per contact per hour, 30 per hour overall.
- **One build per restaurant.** Tenancy is decided at build time (`VITE_TENANT`), so each
  restaurant is its own Vercel project.
- **No menu editor.** Menu and price changes go through the repo (above), by design for V1.
