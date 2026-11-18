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

## Google Play later (optional)

Google Play developer account: $25 once-off. A new personal account must run a closed test
with 12 testers for 14 days before going public; an organisation account skips that but
needs business verification. Upload the `.aab` from the same PWABuilder zip. Play re-signs
the app, so add Play's **App signing key certificate** SHA-256 (Play Console → App integrity)
as a second fingerprint in `assetlinks.json`, or the Play version shows an address bar.

## iPhone and the App Store

Not used. Add to Home Screen is free and gives the same full-screen app. TestFlight and Ad
Hoc both need Apple's paid developer account ($99/year), and TestFlight builds expire every
90 days.

## Not done yet

- Order-ready notifications to the guest's phone (needs the guest's permission and a server
  sender, like the kitchen's lock-screen alerts).
- The Android app file itself (steps above).
