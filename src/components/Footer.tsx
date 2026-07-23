import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { config } from '../config';
import { Logo } from './Logo';

// Navy footer: the closing bracket to the navy hero, in Jimmy's logo colors.
export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-paper/70 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_0.7fr_1fr] gap-12 lg:gap-16">
        {/* Brand */}
        <div className="space-y-6">
          <Link to="/" className="inline-block" aria-label="Home">
            {/* The oval badge is navy-on-navy here, so ring it in periwinkle */}
            <span className="inline-block rounded-full ring-2 ring-secondary/60">
              <Logo className="h-20 w-auto" />
            </span>
          </Link>
          <p className="max-w-sm leading-relaxed">{config.venue.description}</p>
          <div className="flex gap-3">
            <a href={config.socials.facebook} aria-label="Facebook" className="bg-paper/10 p-3 rounded-full hover:bg-secondary hover:text-ink transition-colors">
              <Facebook size={18} />
            </a>
            <a href={config.socials.instagram} aria-label="Instagram" className="bg-paper/10 p-3 rounded-full hover:bg-secondary hover:text-ink transition-colors">
              <Instagram size={18} />
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold tracking-wide text-paper">Explore</h3>
          <ul className="space-y-3">
            {config.nav.links.map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="hover:text-paper transition-colors">
                  {link.name}
                </Link>
              </li>
            ))}
            {config.features.ordering && (
              <li><Link to="/order" className="hover:text-paper transition-colors">Order</Link></li>
            )}
          </ul>
        </div>

        {/* Contact & hours */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold tracking-wide text-paper">Find us</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <span>{config.venue.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-secondary flex-shrink-0" size={18} />
              <span>{config.venue.phone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="text-secondary flex-shrink-0" size={18} />
              <span>{config.venue.email}</span>
            </div>
            <div className="pt-5 border-t border-paper/15">
              <h4 className="text-paper font-medium mb-3 flex items-center gap-2 text-sm">
                <Clock size={16} className="text-secondary" />
                <span>Opening hours</span>
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {config.venue.hours.map((h) => (
                  <React.Fragment key={h.day}>
                    <span>{h.day}</span>
                    <span className="text-right">{h.time}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-paper/15 text-center text-sm text-paper/40">
        <p>© {new Date().getFullYear()} {config.venue.name} {config.venue.nameSuffix}. Website by Streamline Automations.</p>
      </div>
    </footer>
  );
};
