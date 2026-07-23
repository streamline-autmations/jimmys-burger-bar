import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Car, MessageCircle } from 'lucide-react';
import { config } from '../config';
import { Magnetic } from '../components/Magnetic';
import { fadeInUp } from '../lib/motion';

export const Visit: React.FC = () => {
  const { venue } = config;

  return (
    <div className="pt-28 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div {...fadeInUp} className="max-w-xl mb-14">
          <span className="font-script text-2xl text-primary">57 Loch Street</span>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold text-ink mt-1 mb-4">Come find us</h1>
          <p className="text-ink/60 text-lg">
            Right on Loch Street in the middle of Meyerton. Easy to find, even
            easier to come back to.
          </p>
        </motion.div>

        <motion.div {...fadeInUp} className="relative h-[250px] md:h-[340px] overflow-hidden bg-ink mb-10">
          <img src="/images/jimmys-logo-2.png" alt="Jimmy's Burger Bar burgers and salad" loading="eager" className="absolute inset-0 w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/40 to-transparent" />
          <div className="absolute left-6 bottom-6 md:left-10 md:bottom-10 max-w-md text-surface"><span className="text-xs font-bold tracking-[0.16em] uppercase text-accent">Worth the trip</span><p className="font-display text-2xl md:text-4xl font-extrabold leading-[0.98] mt-2">Pull in hungry. Leave with a story.</p></div>
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-24">
          {/* Map */}
          <motion.div {...fadeInUp} className="lg:col-span-2 rounded-2xl overflow-hidden ring-8 ring-surface shadow-md min-h-[380px] lg:min-h-[520px]">
            <iframe
              src={venue.googleMapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 'inherit' }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map to Jimmy's Burger Bar"
            ></iframe>
          </motion.div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <motion.div {...fadeInUp} className="bg-surface rounded-2xl shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.22)] ring-1 ring-ink/[0.04] p-7">
              <h2 className="font-display text-xl font-extrabold text-ink mb-5 flex items-center gap-3">
                <Clock className="text-primary" size={20} />
                <span>Hours</span>
              </h2>
              <div>
                {venue.hours.map((h) => (
                  <div key={h.day} className="flex justify-between items-center py-2.5 border-b border-ink/10 last:border-0 text-sm">
                    <span className="text-ink/50">{h.day}</span>
                    <span className="font-medium text-ink">{h.time}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/40 mt-4">Kitchen closes an hour before we do.</p>
            </motion.div>

            <motion.div {...fadeInUp} className="bg-surface rounded-2xl shadow-[0_8px_30px_-14px_rgb(var(--color-ink)/0.22)] ring-1 ring-ink/[0.04] p-7 flex-1">
              <h2 className="font-display text-xl font-extrabold text-ink mb-5 flex items-center gap-3">
                <MapPin className="text-primary" size={20} />
                <span>Get in touch</span>
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-ink/35 mt-0.5 shrink-0" />
                  <span className="text-ink/70">{venue.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-ink/35 shrink-0" />
                  <a href={`tel:${venue.phone}`} className="text-ink/70 hover:text-ink transition-colors">{venue.phone}</a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-ink/35 shrink-0" />
                  <a href={`mailto:${venue.email}`} className="text-ink/70 hover:text-ink transition-colors">{venue.email}</a>
                </div>
                <div className="flex items-start gap-3">
                  <Car size={16} className="text-ink/35 mt-0.5 shrink-0" />
                  <span className="text-ink/70">Street parking right outside</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-7">
                <Magnetic strength={0.2}>
                  <a
                    href={`https://wa.me/${venue.whatsapp}?text=${encodeURIComponent(`Hi! I'd like to book a table at ${venue.name}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-primary text-surface py-3.5 rounded-full font-display font-bold text-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <MessageCircle size={16} />
                    <span>Book a Table</span>
                  </a>
                </Magnetic>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border-2 border-ink/25 text-ink py-3.5 rounded-full font-display font-bold text-sm hover:bg-ink hover:text-paper transition-colors duration-200"
                >
                  <span>Get Directions</span>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
