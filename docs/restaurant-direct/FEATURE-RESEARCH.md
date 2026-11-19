# Restaurant Direct: what would make the offer hard to refuse

Research for closing Jimmy's Burger Bar and then the restaurants around it. Written 2026-11-19
by Claude (Opus 5.5). Nothing was built or changed. Every web source below was accessed
**2026-11-19** unless a different date is given. Figures marked **(vendor)** come from a company
selling the thing it measures. **Guess** means my own estimate or arithmetic, not a source.

## Read this first: the price, not a feature, is the main objection

On a typical collection order, the proposed 15% fee costs the restaurant more than Uber Eats
pickup does.

| Per R276 food order (build plan's average, line 105) | Ex VAT | Incl. 15% VAT |
|---|---:|---:|
| Uber Eats SA pickup, 14% (card processing included) | R38.64 | R44.44 |
| Uber Eats SA, Uber delivers, 30% | R82.80 | R95.22 |
| Restaurant Direct 15% + Payfast Instant EFT 2% | R41.40 + R5.52 | R47.75 to R53.96 * |
| Restaurant Direct 15% + Payfast card 3.2% + R2 | R41.40 + R10.83 | R53.86 to R60.07 * |

\* My arithmetic (guess) on the rates cited under Pitch ammunition. The lower figure adds VAT to the
Payfast fee only. The higher one also adds VAT to our 15%, which applies if Streamline charges VAT.
The build plan (line 41) also leaves open whether food VAT is in the commission base. Uber's commission is on the
VAT-inclusive price, and Uber charges VAT on top, according to
[Menuthere](https://menuthere.com/en/delivery-app-commission/uber-eats-south-africa) (a competitor's
page, "checked September 2026").

On a monthly basis: at the build plan's R15k/month target, 15% is R2,250. SA direct-ordering
products advertise 0% commission at
[R729 per location per month (Supaorder)](https://www.supaorder.com/pricing/south-africa) and
[R1,000/month (Resto)](https://resto.co.za/).

So Restaurant Direct clearly wins only against platform **delivery** (30%) and against the apps'
menu markup. A collection-first pilot at 15% competes with Uber's 14% pickup and loses. **Judgement,
not a finding:** the pilot is easier to accept on a flat fee close to the R999 floor already in the
plan, or with a percentage clearly below 14%. Change that before adding features. Jimmy's trades on
Mr D rather than Uber Eats (build plan line 99). Mr D does not publish its rates (see the survey), so
the honest comparison uses Jimmy's own Mr D statement.

**Update, 2026-11-19:** Jimmy's already has its own driver and a scooter (from Christiaan). That
makes direct delivery realistic, and delivery is where we win clearly: Uber takes 30% when its
couriers deliver. Delivery fees (R39/R49) stay provisional until the zone and the rider cost are
agreed (build plan line 57).

## Ranked shortlist

Status was checked in this worktree (`restaurant-direct/tenant-rehearsal`, which includes master).

| # | Feature | Why an owner cares | Evidence | Status here | Size | Risk | Demo |
|---|---|---|---|---|---|---|---|
| 1 | **"Money kept" monthly owner report**: direct sales, Payfast fees, our fee, and what the same orders would have cost at the owner's Mr D rate | Money. It proves the saving every month instead of once in a pitch | [Uber Eats SA pricing](https://merchants.ubereats.com/za/en/pricing/) (30% / 14%); [Payfast fees](https://payfast.io/fees/) | Partly: `/admin/report` with CSV export (`src/pages/admin/AdminReport.tsx`, commit e05c0e1). "Commission kept" shows only when `reporting.appCommissionRate` is set, so it still needs Jimmy's Mr D rate | S–M | The comparison rate must come from the owner's own Mr D statement, because Mr D publishes no rates | Yes |
| 2 | **"Same price as in the shop" promise** on the menu and checkout | Guests. The apps' menu markup is the reason to order direct | [MyBroadband, 19 Jun 2025](https://mybroadband.co.za/news/it-services/599120-hidden-price-increase-when-buying-food-through-mr-d-and-uber-eats.html): app markups of 14% to 40.5%; [Mr D terms](https://terms.mrd.com/): prices "may differ from in-store prices" | New (copy and one config flag) | S | It must be true. Confirm the till prices match `menu_items` before showing it | Yes |
| 3 | **Launch kit**: Google Business Profile "Order online" set to our link as preferred, plus a counter/bag QR sticker and the Instagram bio link | Money. Without it there are no orders, and Google may still send guests to Mr D | [Google help: manage online ordering, preferred provider](https://support.google.com/business/answer/10842217) | New (setup work, no code) | S | Google says order links vary "in some countries and regions". Not confirmed for SA | Yes |
| 4 | **One-tap reorder**: "Order again" refills the last basket from the tracking page and receipt | Money and guests. Regulars repeat the same order | [Owner.com](https://owner.com/blog/restaurant-mobile-app): app guests show "2x the reorder rate" (vendor, no method given) | Built (commit e05c0e1): "Order this again" on the tracking page and in **My orders** refills the cart at today's prices (`src/pages/Track.tsx`, `ReorderButton`). Still to add: a reorder link in the receipt email | S | Low. A changed price is already refused (`menuChanged` copy) | Yes |
| 5 | **Add-ons at the cart**: make it a meal, extra patty, sauce | Money. Raises the average order | [Flipdish: The Hip Fish](https://www.flipdish.com/gb/resources/blog/the-hip-fish-how-they-increased-average-order-value-with-cs-support) AOV +36%; [Pizza Dog](https://www.flipdish.com/customers/pizza-dog) +20% (both vendor) | New: no modifier model, only `extrasNote` in `src/core/config/types.ts:227` | M | `create_order` prices from `menu_items`, so modifiers need a migration on every tenant and a new seed format | Yes |
| 6 | **Instant EFT / Capitec Pay nudged first** at checkout | Money. 2% instead of 3.2% + R2 on every order | [Payfast fees](https://payfast.io/fees/) | Partly: Payfast hosted checkout is built (`supabase/functions/payfast/`). Whether we can pre-select a method is **unverified** | S | Forcing EFT loses card-only guests, so keep the choice | Yes |
| 7 | **WhatsApp updates to the guest** ("accepted", "ready to collect") | Guests and time. Fewer "is it ready?" calls | [ITWeb / Cellfind, 7 Oct 2026](https://www.itweb.co.za/office/cellfind/content/LPp6VMrBr1LMDKQz) (vendor): SA utility rate US$0.0095 per message from 1 Oct 2026. Guess: under R0.20 per message | New. Guest updates today are email plus `/track` (`docs/NOTIFICATIONS.md`) | M | Meta business verification, template approval and per-message billing. Load on the shared n8n host | No (until built) |
| 8 | **Stamp-card loyalty on the phone number** (e.g. every 8th burger free) | Money. Repeat orders | [Slerp case studies](https://www.slerp.com/case-studies/): 4x to 5x repeat orders at several brands (vendor); [Flipdish loyalty](https://www.flipdish.com/resources/blog/loyalty-online-ordering) (vendor) | New | M–L | A discount inside server-priced `create_order`, abuse through phone numbers, and the commission base must net it off | Yes (demo build) |
| 9 | **POPIA-clean opt-in and a win-back message** to guests who have not ordered in N weeks | Money. It brings back lapsed regulars at near-zero cost | POPIA s69(3) existing-customer route ([MJK Inc](https://mjkinc.co.za/popia/existing-customer-exception)); CPA opt-out registry as a second layer ([Werksmans](https://werksmans.com/your-customer-consented-to-direct-marketing-but-can-you-still-contact-them-after-they-have-registered-on-the-national-opt-out-registry/)) | Partly: `marketingConsent` exists (`src/core/data/types.ts:41`) but is hard-coded `false` (`src/pages/Order.tsx:406`). No UI, no sender | M | Legal. Every message needs the sender's identity and an opt-out (s69(4)). Get a legal check before the first send | No (show the tick box only) |

**Build plan "not now" items:** none of the nine rows above comes from the plan's later list
(native apps, line 33; full menu editor, line 31; API delivery dispatch, line 57; shared data, line 7;
shared n8n handler, line 64). Row 5 does not need the menu editor, because add-ons can live in the
tenant config the way prices do now.

## Pitch ammunition

| # | Number | Source and date |
|---|---|---|
| 1 | Uber Eats SA takes **30%** when its couriers deliver (**33%** on Uber One orders), **14%** on pickup and self-delivery | [merchants.ubereats.com/za/en/pricing](https://merchants.ubereats.com/za/en/pricing/), no effective date shown, accessed 2026-11-19 |
| 2 | On the apps, the same item costs **14% to 40.5% more** than in store (e.g. a Rocomamas burger, R70 in store, R92 on both apps) | [MyBroadband, 19 Jun 2025](https://mybroadband.co.za/news/it-services/599120-hidden-price-increase-when-buying-food-through-mr-d-and-uber-eats.html). The sample was chains only, not independents |
| 3 | The Competition Commission found that **independent restaurants pay higher commissions than chains** on Uber Eats and Mr D | [Engineering News on the OIPMI final report, 31 Jul 2023](https://www.engineeringnews.co.za/article/competition-commission-publishes-final-platforms-market-report-2023-07-31) |
| 4 | Payfast costs **2% (min R2) for Instant EFT and Capitec Pay** and **3.2% + R2 for cards**, ex VAT, with no monthly fee listed | [payfast.io/fees](https://payfast.io/fees/), page undated (© 2026), accessed 2026-11-19 |
| 5 | Uber Eats SA delivery on a R276 order: **R95.22** including VAT. The same order paid direct by Instant EFT costs Jimmy's **R6.35** in Payfast fees, before our fee | Guess: my arithmetic on rows 1 and 4, plus 15% VAT. Use Jimmy's own basket and Mr D statement in the meeting |

Do not use the vendor case-study percentages (Owner, Slerp, Flipdish) as promises to an owner.
They are self-selected success stories.

## Don't build

- **Native iOS/Android app.** It is on the plan's later list (line 33), and home-screen install already exists (`src/components/InstallApp`).
- **A load-shedding offline mode.** Eskom reports more than 500 days without load shedding since 16 May 2025 ([SAnews](https://www.sanews.gov.za/node/84735)), although local "load reduction" continues in some areas. The existing retry contract and WhatsApp fallback already cover patchy data.
- **Separate SnapScan or Zapper integrations.** Payfast already offers both on its hosted page ([fees](https://payfast.io/fees/)).
- **Our own rider fleet.** Uber Direct sells per-delivery dispatch with "no commissions" in SA ([pricing](https://merchants.ubereats.com/za/en/pricing/)). Get a quote for it in Phase 5 instead.
- **Cash on collection.** It invites no-shows. Mr D also refuses cash for collection ([terms](https://terms.mrd.com/)).
- **A "Meyerton eats" multi-restaurant app.** That is rebuilding Mr D. Judgement.
- **A WhatsApp ordering chatbot.** The checkout already takes payment. A bot adds Meta costs and a second order path to support. Judgement.
- **Tiered points loyalty.** A stamp card (row 8) does the same job with less to explain at the counter. Judgement.
- **A full menu editor.** It is on the plan's later list (line 31). Config plus `npm run menu:sql` works for one restaurant.

## Local survey: Meyerton and the Vaal (public pages only)

"Independent" is my guess from the names. I did not confirm ownership.

| Restaurant | Area | Ordering today | Source |
|---|---|---|---|
| Si' Moanee's Pizza | Riversdale, Meyerton | Own online ordering ("FoodBooking app"), WhatsApp, **and** live on Mr D (4.6) | [site](https://simoanees.co.za/), [Mr D](https://www.mrd.com/delivery/restaurant/si-moanees-pizza-meyerton-riversdale/25989) |
| Campanella Pizza | 19 Loch St, Meyerton | Phone and Instagram. No website or app listing found. Google 4.4 (437 reviews) | [Restaurant Guru](https://restaurantguru.com/Campanella-Pizza-Meyerton) |
| Glamour Magic Take Away | Meyerton | Live on Mr D (4.6) | [Mr D](https://www.mrd.com/delivery/restaurant/glamour-magic-take-away-meyerton-meyerton/28132) |
| Just Wingz | Meyerton CBD | Live on Mr D (4.5) | [Mr D](https://www.mrd.com/delivery/restaurant/just-wingz-meyerton-meyerton-cbd/22952) |
| Fat Cake City | Meyerton | Live on Mr D (4.7). A search result also showed it on Uber Eats (page not opened) | [Mr D](https://www.mrd.com/delivery/restaurant/fat-cake-city-meyerton-meyerton/26869) |
| Net1netjie Pub & Grill | Henley on Klip | Mr D page exists but shows "The store is not currently available" | [Mr D](https://www.mrd.com/delivery/restaurant/net1netjie-pub-grill-henley-on-klip/28736) |
| Grill To Go | Vanderbijlpark | Live on Mr D (4.2) | [Mr D](https://www.mrd.com/delivery/restaurant/grill-to-go-vanderbijlpark/33999) |
| Farm Ñ Sea Grillhouse | Vanderbijlpark | Own site with a cart and a WhatsApp line. Online payment not confirmed. Bookings go through WhatsApp | [site](https://farmnseagrill.com/) |
| In-N-Out Roadhouse | Vanderbijlpark | "Call ahead" or WhatsApp. No online ordering | [site](https://ubiquitous-toffee-2d31c3.netlify.app/) |
| Chains on Loch St / Meyer St (KFC, Steers, McDonald's, Barcelos, Wimpy) | Meyerton | Brand apps plus Mr D (and Uber Eats for some) | e.g. [Steers on Mr D](https://www.mrd.com/delivery/restaurant/steers-meyerton-meyerton/22818), [Barcelos on Mr D](https://www.mrd.com/delivery/restaurant/barcelos-meyerton-meyerton/22967) |

What it shows: locally, Mr D is the default, and only Si' Moanee's was found taking orders through
its own system. Campanella, Farm Ñ Sea and In-N-Out Roadhouse run on phone and WhatsApp, which makes
them the most natural next prospects after Jimmy's (guess).

## Limits of this research

- **Mr D's commission is not public.** Mr D declined to disclose it to MyBroadband. The "~30%" figure is secondhand, so it is not used above.
- The Uber Eats page states no VAT treatment or contract term. Those come from Menuthere's reading of Uber's terms, not checked against the terms themselves.
- The WhatsApp rate comes from a vendor press release, not from Meta's rate card.
- I found no clean 2025–2026 figure for WhatsApp's share of SA users, so none is quoted.
- I did not check whether Google shows the "Order online" link for South African listings.
