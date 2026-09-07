import React, { useState } from 'react';
import { LayoutDashboard, LogOut, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { eyebrowClass } from './adminUtils';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: UtensilsCrossed, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
];

// Two navigations for two real postures. On a desktop back office the tabs sit
// in the header where they are read left to right; on a phone carried around
// the floor they sit at the bottom, in thumb reach, because the previous single
// header row scrolled sideways and pushed "Customers" off screen entirely.
export const AdminLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSignOutError(error.message);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <NavLink to="/admin" className="mr-auto flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <img src="/images/logo.png" alt="" width={36} height={36} className="h-9 w-auto" />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold text-primary">Jimmy&apos;s</span>
              <span className={`${eyebrowClass} block`}>Staff console</span>
            </span>
          </NavLink>

          <nav className="hidden gap-1 md:flex" aria-label="Admin navigation">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    isActive ? 'bg-primary text-surface' : 'text-ink/65 hover:bg-paper hover:text-ink'
                  }`
                }
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 px-3.5 font-display text-sm font-bold text-ink transition-colors hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Logout'}</span>
          </button>
        </div>
        {signOutError && (
          <p className="mx-auto max-w-7xl px-4 pb-3 text-right text-sm font-medium text-red-700 sm:px-6 lg:px-8" role="alert">
            {signOutError}
          </p>
        )}
      </header>

      {/* Bottom padding clears the mobile tab bar. */}
      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12 lg:px-8">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Admin navigation"
      >
        <div className="grid grid-cols-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 ${
                  isActive ? 'text-primary' : 'text-ink/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-accent/30' : ''
                    }`}
                  >
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
