# Kitchen screen: staff setup

The kitchen screen is the staff console's live order view at **`/admin/kitchen`**. Paid
collection orders appear on it within a few seconds, chime, and stay gold until someone
accepts them. Use it on the POS computer and on the chef's phone at the same time; both
show the same orders and only the first tap on an order counts.

Everyone signs in with their **own** staff login. Never share one login between devices
you cannot see.

## POS computer (Chrome or Edge, Windows)

1. Open the site, go to `/admin/login`, sign in, then open **Orders → Kitchen screen**.
2. Install it as its own window:
   - **Chrome:** menu ⋮ → *Cast, save and share* → *Install page as app…* → Install.
   - **Edge:** menu … → *Apps* → *Install this site as an app*.
3. Right-click the new "Kitchen" icon on the taskbar → *Pin to taskbar*.
4. Turn the PC's volume up and make sure the sound goes to speakers someone can hear.
5. Keep the window visible next to the till during service. The screen stays awake while
   it is in front. *Full screen* fills the monitor; press Esc to get the till back.

## Chef's phone

- **Android (Chrome):** sign in, open the kitchen screen, menu ⋮ → *Add to Home screen*
  (or *Install app*). Open it from the new icon.
- **iPhone (Safari):** sign in, open the kitchen screen, Share → *Add to Home Screen*.
  Open it from the new icon. **The ring/silent switch must be on ring**: iPhone mutes the
  alert in silent mode.

Keep the screen open and in front, on a charger. A locked phone or a closed app gets no
alert; lock-screen notifications are a separate step that is not set up yet.

## Start of every shift

1. Open the kitchen screen on the POS and the phone.
2. The pill at the top says **Live** and "Updated a few s ago".
3. Tap **Enable sound**, then **Test alert**. You must hear three beeps on each device.
   Browsers block sound until someone taps the page, so do this after every restart.
4. Volume up, phone on ring, chargers in.
5. Agree who is called if an order sits unaccepted (the screen shows it after 5 minutes).

## During service

- **Gold ticket:** paid and waiting. The clock shows how long. Tap a time to accept; that
  time is what the guest sees on their tracking page.
- Then **Start preparing**, **Mark ready**, and **Collected** when the guest has it.
- If two people tap the same order, the first one counts and the other screen says the
  order was already moved. Nothing is done twice.
- Cancelling and refunds stay on the full Orders screen, not the kitchen screen.

## Delivery orders (staging preview only)

Only the staging site takes delivery orders, as a showcase. The zone, the fees (R39 and
R49) and the rider number are examples until Jimmy's agrees real ones.

- A delivery ticket has a **Delivery** panel: street address, suburb, the guest's note
  for the rider and the delivery fee (already inside the paid total).
- After **Mark ready**, tap **Send to rider**. It opens WhatsApp to the dispatcher with
  the reference, the address and the items. Check the message, then send it. Nothing is
  sent until you press send in WhatsApp.
- When the rider leaves, tap **Out for delivery**. The guest's tracking page says
  *Out for delivery*.
- When the rider confirms the drop-off, tap **Delivered**. The order closes.

### If a delivery fails

Only a manager or owner sees **Delivery failed** (on a ready or out-for-delivery ticket).

1. Phone the guest first. If they would rather collect, keep the order and do not
   mark it failed.
2. Otherwise tap **Delivery failed**, then **Yes, delivery failed**. The order leaves
   the kitchen screen and its payment shows **refund pending**. The guest's tracking
   page says *Not delivered, refund pending*.
3. Refund the full amount in the Payfast dashboard, then record the refund as described
   in PAYMENTS.md. Nothing on this screen sends money.

## If the screen says Offline or Not updating

- **Offline (gold banner):** the device has lost Wi-Fi or data. Guests can still order and
  pay; their orders will appear the moment the connection is back, with no refresh needed.
  Check the Wi-Fi. If it does not come back in a few minutes, use the other device (a
  phone on mobile data works), or pause online ordering on the **Ordering** screen.
- **Reconnecting:** the live link dropped. The screen still checks every 15 seconds; no
  action needed unless it stays like that.
- **Not updating:** tap **Refresh**. If it still fails, go back to the console and sign in
  again (the login may have expired).

## What is stored on the device

Nothing beyond the login session. The installed app has no offline cache, so no orders or
guest details are kept on the PC or phone.
