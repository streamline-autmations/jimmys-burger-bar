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

Keep the screen open and in front, on a charger when you can. With the kitchen screen in
front, the phone chimes. When the phone is locked or the app is closed, it only alerts if
lock-screen alerts are switched on (next section).

## Lock-screen alerts (chef's Android phone, Chrome)

Set this up **only on the phone that should buzz**, usually the chef's. Each phone that
switches it on gets its own alert, so leave it off on phones nobody watches.

1. Open the kitchen screen from the installed icon (or in Chrome), signed in with the
   chef's own login.
2. Tap **Lock-screen alerts** in the top bar. Chrome asks "Allow notifications?" Tap
   **Allow**. On Android 13 and newer the phone asks as well. Tap **Allow** again.
3. The button turns white and reads **Lock-screen alerts on**.
4. Android settings, one time only. Names differ by brand:
   - *Settings → Apps → Chrome → Notifications*: allowed, with sound. If the kitchen
     was installed as an app, check that app's entry too.
   - *Settings → Apps → Chrome → Battery*: **Unrestricted** (Samsung: "Unrestricted" or
     remove it from "Sleeping apps"; Xiaomi: "No restrictions"). Without this, some phones
     hold alerts back until someone unlocks them.
   - Do Not Disturb off during service, or Chrome allowed as an exception.
5. Test it: lock the phone, place a test order on the staging site and pay it in the
   sandbox. Within a few seconds the phone should buzz and show **"New order at
   Jimmy's"**. Tapping it opens the kitchen screen.

What the lock screen shows: always just "New order at Jimmy's" and "Open the kitchen
screen to accept it". Never the guest's name, the food or the amount. Several orders
while the phone is off show as one alert. The alert says something is waiting. It does
not replace the kitchen screen: accept orders on the screen as usual.

If you tapped **Block** by mistake, the button disappears and the screen keeps using the
chime only. To undo it: Chrome menu ⋮ → *Settings → Site settings → Notifications*, find
the site, set it to **Allow**, then reopen the kitchen screen and tap the button again.

To stop alerts on a phone (it changed hands, say), tap **Lock-screen alerts on** once. It
switches off for that phone only.

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
guest details are kept on the PC or phone. A phone with lock-screen alerts on also keeps
a small background script that only shows the alert. It stores nothing, and the alert
itself carries no order details.
