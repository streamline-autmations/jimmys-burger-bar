import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { config } from '../config';
import { payFirst } from '../core/tenant';
import { useAppShell } from '../lib/appShell';
import { data as db } from '../core/data';

// Privacy notice and data-deletion instructions (Google Play needs a public URL
// for both). Written from what the code actually stores and sends:
//   orders/bookings  -> create_order / create_booking; the host is named by the data adapter (storedWith)
//   notifications    -> the order/booking/review webhooks (supabase/tenants/<slug>.json)
//   payment          -> Payfast hosted checkout (supabase/functions/payfast)
//   address lookup   -> Photon (src/lib/addressSearch.ts)
//   order alerts     -> guest_push_subscriptions (20261119120000), deleted on completion
//   device storage   -> cartStore, payment.ts, installApp.ts, orderHistory.ts, App.tsx
// Anything only the restaurant can confirm comes from config.privacy and is
// shown as "to be confirmed" until it is filled in. Never invent it here.

const UPDATED = '19 November 2026';

/** PLACEHOLDER: a fact the restaurant has not confirmed yet. Visible on purpose, so it cannot ship unnoticed. */
const ToConfirm: React.FC<{ what: string }> = ({ what }) => (
  <span data-placeholder="" className="rounded-md border border-dashed border-ink/40 bg-accent/20 px-1.5 py-0.5 font-semibold text-ink">
    {what}: to be confirmed by {config.venue.name}
  </span>
);

const Section: React.FC<{ id?: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} aria-labelledby={`${id ?? title}-heading`} className="scroll-mt-28 border-t border-ink/10 pt-6">
    <h2 id={`${id ?? title}-heading`} className="font-display text-2xl font-extrabold text-primary">{title}</h2>
    <div className="mt-3 space-y-3 text-ink/80 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">{children}</div>
  </section>
);

export const Privacy: React.FC = () => {
  const appShell = useAppShell();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#delete') document.getElementById('delete')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [hash]);
  const { venue, privacy } = config;
  const name = venue.name;
  const delivery = config.ordering.fulfilment.includes('delivery');
  const addressLookup = payFirst && !!config.ordering.deliveryPreview?.addressSearch;
  const email = <a href={`mailto:${venue.email}`} className="font-bold text-primary underline underline-offset-2">{venue.email}</a>;
  const whatsapp = <a href={`https://wa.me/${venue.whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline underline-offset-2">WhatsApp {venue.phone}</a>;

  return (
    <div className={`${appShell ? 'pt-3' : 'pt-28'} pb-24`}>
      <article className="mx-auto max-w-2xl px-4 md:px-8">
        <span className="font-script text-2xl text-primary">your details</span>
        <h1 className="mt-1 font-display text-4xl font-extrabold text-ink md:text-5xl">Privacy</h1>
        <p className="mt-3 text-lg text-ink/70">
          What {name} keeps when you order{config.features.reservations ? ' or book' : ''}, who else sees it, and how to have it deleted. Last updated {UPDATED}.
        </p>

        <div className="mt-8 space-y-8">
          <Section title="Who we are">
            <p>
              {name}, {venue.address}. Contact us at {email} or on {whatsapp}.
            </p>
            <ul>
              <li>Business name: {privacy?.operator ?? <ToConfirm what="Legal name of the business" />}</li>
              <li>Information officer: {privacy?.informationOfficer ?? <ToConfirm what="Information officer and contact" />}</li>
            </ul>
          </Section>

          <Section title="What we collect">
            <p>When you order online:</p>
            <ul>
              <li>your name, phone number and email address;</li>
              <li>what you ordered, the total, and the time you want it;</li>
              {delivery && <li>for a delivery, the address and any note for the rider;</li>}
              {config.ordering.fulfilment.includes('table') && <li>for a table order, your table number.</li>}
            </ul>
            {config.features.reservations && (
              <p>When you book a table: your name, phone number, email address, the date, time and number of guests, your seating choice and any note you add.</p>
            )}
            <p>We do not ask for your ID number, date of birth or card details, and you do not need an account.</p>
          </Section>

          <Section title="Why we use it">
            <ul>
              <li>to make your order and hand it over, and to contact you if there is a problem with it;</li>
              <li>to email you a confirmation, and to let you check your order with its reference and your email or phone number;</li>
              <li>to recognise a returning guest by email or phone, so staff see your earlier orders and bookings;</li>
              <li>after you have been, we may send one email asking how it was.</li>
            </ul>
            <p>We do not send marketing, and we do not sell or rent your details to anyone.</p>
          </Section>

          <Section title="Who else sees it">
            <ul>
              {db.storedWith
                ? <li><strong>{db.storedWith}</strong> stores orders{config.features.reservations ? ' and bookings' : ''} in its cloud database for us.</li>
                : <li>In this demonstration, orders{config.features.reservations ? ' and bookings' : ''} are fictional and stay in this browser.</li>}
              <li><strong>Our notification service</strong> receives each new order{config.features.reservations ? ' and booking' : ''} so it can email the confirmation and alert staff. It is run for {name} by Streamline Automations, which built this website.</li>
              {payFirst && <li><strong>Payfast</strong> takes your payment on its own page. Your card or bank details go to Payfast, never to us.</li>}
              {addressLookup && <li><strong>Photon</strong> (by komoot) receives the street address you type, to suggest a match. Nothing else is sent with it.</li>}
              <li><strong>Google</strong> serves the fonts on this site{config.features.reservations ? ' and the map on the Visit page' : ''}, so it sees your device's internet address when they load.</li>
              <li><strong>Vercel</strong> hosts the website and keeps short technical logs, such as internet addresses, to keep it running.</li>
            </ul>
            <p>Some of these companies store data outside South Africa.</p>
          </Section>

          <Section title="Order-ready alerts">
            <p>
              If you switch on an alert on the tracking page, your phone gives us a push address for this one order. We keep it with that order and delete it when the order is collected,
              delivered or cancelled. The alert says only that your order is ready: no name, dish or amount is sent through the phone's notification service (such as Google, Apple or Mozilla).
            </p>
          </Section>

          <Section title="Kept on your phone">
            <ul>
              <li>your cart, until you close the page;</li>
              {payFirst && <li>the reference of an order you are paying for, until it is collected or cancelled;</li>}
              <li>whether you have seen the opening animation, and whether you closed the "get the app" sticker;</li>
              <li>in the installed app only: your name, phone number, email and the orders you placed from that phone, so checkout is quicker and you can reorder.</li>
            </ul>
            <p>No advertising or analytics trackers are used. In the app, <strong>My orders</strong> then <strong>Forget my details</strong> clears your saved contact details, order history{payFirst ? ' and the reference and email saved to resume a payment' : ''} from this device.</p>
          </Section>

          <Section title="How long we keep it">
            <p>{privacy?.retention ?? <ToConfirm what="How long order and booking records are kept" />}</p>
          </Section>

          <Section title="Your rights">
            <p>
              Under the Protection of Personal Information Act (POPIA) you can ask what we hold about you, ask us to correct it or delete it, and object to how we use it.
              If you are unhappy with our answer you can complain to the Information Regulator at{' '}
              <a href="https://inforegulator.org.za" target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline underline-offset-2">inforegulator.org.za</a>.
            </p>
          </Section>

          <Section id="delete" title="Delete your data">
            <ol className="list-decimal space-y-2 pl-5">
              <li><strong>On your phone:</strong> in the app, open <strong>My orders</strong> and tap <strong>Forget my details</strong>. You can also clear this website’s data in your browser settings.</li>
              <li><strong>In our records:</strong> email {email} or send a {whatsapp} message with your name, the phone number or email you ordered with, and your order references if you have them. Ask us to delete your details.</li>
            </ol>
            <p>We will delete your name, phone number, email and addresses from our records. Records the law requires us to keep, such as payment records, are kept only for as long as the law requires.</p>
          </Section>
        </div>

        <p className="mt-10 text-sm text-ink/60">
          <Link to={appShell ? '/orders' : '/'} className="font-bold text-primary underline underline-offset-2">{appShell ? 'Back to My orders' : `Back to ${name}`}</Link>
        </p>
      </article>
    </div>
  );
};
