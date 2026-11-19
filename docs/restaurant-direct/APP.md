# Jimmy's on a guest's phone: the app

The app **is the website**, added to the phone's home screen. Same code, same backend, no
app store. An update reaches every guest the moment the site deploys. Decided 2026-11-18:
installable website plus an Android app file; no native app for now.

## What a guest sees

| Phone | How they get it | Opens to |
|---|---|---|
| iPhone (Safari or Chrome) | The gold "get the APP" sticker → **Show me how** → Share → Add to Home Screen → Add | `/order`, full screen, no browser bar |
| Android (Chrome) | The sticker → **Install the app** (Chrome's own one-tap dialog) | same |
| Android (no prompt, other browsers) | The sticker → **Download the Android app** (once the app file exists, below), or Chrome ⋮ → Install app | same |
| Desktop | Nothing is shown | |

Where the sticker appears:

- **After an order** (tracking page, once payment is received): the full card. This is when it is worth most.
- **Order page**: a short strip above the menu.
- **Every other page, from the second visit**: a short floating strip at the bottom.

"Not now" hides it everywhere for 14 days. Once installed it never shows again, and it never
shows inside the installed app. Rules: `src/lib/installApp.ts` (`shouldOffer`, tested in
`tests/tenants.test.mjs`).

Inside the installed app the few-second brand intro is skipped, so it opens straight on the menu.

## The app shell (2026-11-19)

Opened from the home screen (or as the Android app), the site switches to an app
shell; in a browser nothing changes. Decided once per launch from display mode
(`src/lib/appShell.ts`, `src/components/AppShell.tsx`):

- **Three tabs**: Menu (`/order`), Cart (`/order?view=cart`), My orders (`/orders`). The
  phone's back button moves between them. The cart count lands on the tab like a price sticker.
- **No marketing home page, no navbar, footer or route curtain.** `/` goes to the menu.
- **My orders** lists the orders placed from that phone, with live status from the same
  reference + email check as `/track`, and **Order again**: the same dishes at today's
  prices, naming any dish that is no longer on the menu.
- **Checkout is prefilled** from the last order on that phone, with **Forget my details**
  in the checkout and on My orders. Kept in localStorage only (`src/lib/orderHistory.ts`);
  nothing new is sent to the server. The browser site never remembers details.
- **Privacy** at `/privacy` (linked from My orders), with deletion steps at `/privacy#delete`.

## Order-ready alert to the guest's phone (staging, 2026-11-19)

On the tracking page, once an order is paid (or needs no payment) and still on its way,
the guest can tap **Tell me when it is ready**. One alert at ready, and for a delivery
one more when it leaves. Same design as the kitchen alerts:

- payload-less push; the guest worker (`/sw.js`) shows the same text for everyone:
  "Your order at <venue> is ready". No name, dish or amount reaches a lock screen;
- migration `20261119120000_guest_order_push.sql`: subscriptions are tied to one order,
  added only through `add_guest_push` with the order reference plus its email, never
  readable by anyone, and deleted when the order is completed or cancelled;
- `guest_order_push` is the dedupe row per (order, status), claimed by the
  `kitchen-push` function before sending (`POST {order_id, status}`), VAPID from the
  existing secrets;
- pay-first tenants only (they have `push.url`); the live Jimmy's site shows no opt-in;
- **iPhone**: web push works only for a site added to the Home Screen (iOS 16.4+). In
  Safari the opt-in explains that instead of offering a button.
- Known limit: the push has no payload, so a delivery's second alert ("on its way") shows
  the same "is ready" title. The body says "Tap to see the latest on your order."

Applied to staging only. For the live site it needs the payments and kitchen migrations
first (it reads `payment_status` and `push.url`).
With no connection it shows a small "You are offline" page with Jimmy's phone number instead
of the browser's error page. Nothing else is stored on the phone: menus, prices and orders
always come from the network (`customerServiceWorker` in `vite-plugin-tenant-html.ts`).

## Making the Android app file (Christiaan, about 15 minutes)

This wraps the website as a real Android app (a "Trusted Web Activity"). It creates a
**signing key**: whoever holds it is the only one who can ever update the app. Keep it in a
password manager. `.gitignore` refuses `*.keystore`, `*.jks` and `signing-key-info.txt`.

Do staging first, test it, then repeat for the live domain once the site is live.

1. Open https://www.pwabuilder.com and enter `https://jimmys-staging.vercel.app/order`.
   (Live later: `https://jimmysburgerbar.co.za/order`.) It reads `app.webmanifest`.
2. **Package for stores → Android → Generate package / Options**:
   - Package ID: `za.co.jimmysburgerbar.staging` (live: `za.co.jimmysburgerbar.app`).
     Never change it after release; it is the app's identity.
   - App name and short name: `Jimmy's` (staging: `Jimmy's (test)`).
   - Signing key: **Create new**. Download the zip.
3. From the zip, store `signing.keystore` and `signing-key-info.txt` (passwords) in the password
   manager. Do not put them in the repo.
4. In the repo:
   - copy the `.apk` to `public/downloads/jimmys-staging.apk` (live: `public/downloads/jimmys.apk`);
   - copy `assetlinks.json` to `public/.well-known/assetlinks.json`. When there are two apps
     (staging and live), the file is one JSON array holding both entries;
   - set `app: { androidApk: '/downloads/jimmys-staging.apk' }` in
     `src/tenants/jimmys-staging/config.ts` (live: in `src/tenants/jimmys/config.ts`).
5. Deploy, then check `https://<domain>/.well-known/assetlinks.json` opens as JSON.
6. On an Android phone: open the site, tap **Download the Android app**, allow "install unknown
   apps" for Chrome when asked, install, open. **No browser address bar = correct.** An
   address bar at the top means the fingerprint in `assetlinks.json` does not match the key.

## Google Play, as an organisation (Jimmy's business)

The listing copy, data-safety answers and graphics are in `store/jimmys/` (`LISTING.md`).
Publish under **Jimmy's own organisation account**, not a personal one: the developer
name on the listing is the business, and an organisation account is not subject to the
12-tester, 14-day closed test that new personal accounts must run before going public.

1. **Account** (Jimmy's owner, with Christiaan): play.google.com/console, sign up as an
   **Organisation**, $25 once-off. It needs the business's legal name, address, a
   D-U-N-S number (free from Dun & Bradstreet; allow time for it to be issued) and a
   contact the public can see. Then invite Christiaan under **Users and permissions**
   with release rights, so Streamline can publish without holding the owner's login.
2. **Privacy page facts**: fill `privacy.operator`, `privacy.informationOfficer` and
   `privacy.retention` in `src/tenants/jimmys/config.ts`. Until then `/privacy` shows
   "to be confirmed" in those three places. Deploy, and check
   `https://jimmysburgerbar.co.za/privacy` opens.
3. **Build the bundle**: PWABuilder as above with the live URL and package
   `za.co.jimmysburgerbar.app`. Keep the signing key from the zip in the password manager:
   it is the **upload key**. Use the `.aab` from the zip for Play.
4. **Create the app** in Play Console: name "Jimmy's Burger Bar", App, Free. Under
   **App content** answer: privacy policy URL, no ads, app access "all functionality is
   available without special access", content rating (the Menu page lists alcohol), target
   audience 18+, data safety from `store/jimmys/LISTING.md`.
5. **Store listing**: paste the short and full description, upload `icon-512.png`,
   `feature-graphic-1024x500.png` and the four screenshots.
6. **Internal testing, for the pitch**: Testing > Internal testing > Create release, upload
   the `.aab`, add testers (up to 100 Google accounts, e.g. Jimmy's owner and staff),
   save, then send them the **opt-in link**. Internal releases reach testers within
   minutes and need no public review, so the pitch can install it from the Play Store
   before anything is public.
7. **Play re-signs the app.** Copy Play's **App signing key certificate** SHA-256 (Setup >
   App integrity) into `public/.well-known/assetlinks.json` as a second fingerprint next to
   the upload key's, and deploy. Without it the Play build shows an address bar.
8. On a real Android phone, install from the internal-testing link and check: opens on the
   menu with no address bar; the three tabs; an order appears in My orders; Order again;
   Forget my details.

## iPhone and the App Store

Not used. Add to Home Screen is free and gives the same full-screen app. TestFlight and Ad
Hoc both need Apple's paid developer account ($99/year), and TestFlight builds expire every
90 days.

## Not done yet

- The Android app file itself, and the Play account (steps above).
- Guest order-ready alerts on the live site (staging only; needs pay-first on Jimmy's).
- A real-phone check of the guest alert: proven on staging up to the push service (one
  call per status, dedupe rows claimed, subscriptions deleted on completion), but no
  real handset has received one yet.
