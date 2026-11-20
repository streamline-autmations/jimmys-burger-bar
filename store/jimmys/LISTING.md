# Google Play listing: Jimmy's Burger Bar

Every fact below comes from `src/tenants/jimmys/config.ts` (menu, hours, address,
contact) as of 2026-11-19. Change the config first, then this file. No em dashes in
anything pasted into Play.

Written for the **live** tenant, which takes payment on collection. Order-ready alerts
are not claimed: they only exist on pay-first tenants (staging today). Add the alerts
line below only once the live site takes payment online and the kitchen migrations
plus `20261119120000_guest_order_push.sql` are applied to Jimmy's project.

## App name (30 max)

Jimmy's Burger Bar

## Short description (80 max, this one is 76)

Order from Jimmy's Burger Bar in Meyerton, then track it and order it again.

## Full description (4000 max)

```
Jimmy's Burger Bar, 57 Loch Street, Meyerton. Good food. Good people.

Order from the menu on your phone: breakfast (served until 12), burgers, small plates, platters, steaks, chicken meals, toasted sandwiches, salads and desserts, plus soft drinks.

What the app does
- Opens straight on the menu.
- Order for collection at 57 Loch Street. Jimmy's confirms the time, and you pay when you collect. Delivery and table orders are requests that Jimmy's confirms.
- My orders shows the status of every order you placed from your phone.
- Order again: one tap puts a past order back in your cart at today's menu prices. If a dish is no longer on the menu, the app tells you which one.
- Your name, phone number and email are remembered on your phone only, so checkout is quicker next time. Tap Forget my details to remove them.

No account and no password. No ads.

Opening hours
Mon to Tue: 09:00 to 20:00
Wed to Thu: 09:00 to 21:00
Fri to Sat: 09:00 to midnight
Sunday: closed, except Coffee & Cars one Sunday a month from 9am

Contact Jimmy's on 064 534 6143 (also on WhatsApp) or jimmysburgerbar1@gmail.com.
```

Optional line, ONLY once alerts are live on Jimmy's own site:
`- Get an alert on your phone when your order is ready to collect.`

## Category and contact details

- Category: Food & Drink
- Email: jimmysburgerbar1@gmail.com
- Phone: +27 64 534 6143
- Website: https://jimmysburgerbar.co.za
- Privacy policy: https://jimmysburgerbar.co.za/privacy (live once this branch is deployed)

## Data safety form (from what the code stores and sends)

| Question | Answer |
|---|---|
| Data collected | Name, Email address, Phone number, Address (delivery orders only), Purchase history (orders) |
| Purpose | App functionality (placing and handing over the order), Account management: **no** (there are no accounts) |
| Shared with third parties | No. Supabase (database), the notification service and Vercel (hosting) are service providers acting for Jimmy's, which Play does not count as sharing. On a pay-first site, Payfast takes the card details directly. |
| Optional or required | Required to place an order |
| Encrypted in transit | Yes (HTTPS only) |
| Users can request deletion | Yes: https://jimmysburgerbar.co.za/privacy#delete |
| Data kept on the device only | Remembered contact details and the My orders list (not "collected" in Play's sense: it never leaves the phone) |
| Ads | None. No analytics or advertising SDKs |

## Content rating

Answer the questionnaire honestly: the in-app **Menu** page lists beer, cocktails,
wine and shots (only soft drinks can be ordered in the app). Expect an "alcohol
reference" descriptor. Target audience: 18 and over is the safe choice for a bar menu.

## Assets in this folder

| File | Size | Source |
|---|---|---|
| `icon-512.png` | 512x512 | Christiaan-supplied app icon artwork (logo on a navy starburst over golden yellow, updated 2026-11-20). Same file as `public/images/app/icon-512.png` |
| `feature-graphic-1024x500.png` | 1024x500 | Real photo `public/images/gallery/burger-macro.jpg`, the real logo, the brand's own tagline "Good food. Good people." and the real address |
| `screenshots/1-menu.jpg` | 1080x1920 | App shell, menu tab. **Contains AI-generated breakfast photos** (CLAUDE.md table): retake after the real shoot |
| `screenshots/2-burgers.jpg` | 1080x1920 | App shell, burgers with the checkout bar. **Contains AI-generated burger photos**: retake after the real shoot |
| `screenshots/3-cart.jpg` | 1080x1920 | App shell, Cart tab |
| `screenshots/4-my-orders.jpg` | 1080x1920 | App shell, My orders. The order shown is a fictional staging test order (JB-1119-SHOTS1, @example.com) |

The screenshots were taken from the live Jimmy's tenant built against the staging
database, at 360x640 CSS pixels and 3x density. The same files are in
`public/images/app/screenshots/` and listed in the web app manifest.
