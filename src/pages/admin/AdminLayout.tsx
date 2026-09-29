import React, { useState } from 'react';
import { LayoutDashboard, LogOut, ShieldCheck, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { config } from '../../config';
import { eyebrowClass } from './adminUtils';

const navItems = [
  { to: '/admin', label: 'Today', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/bookings', label: 'Bookings', icon: UtensilsCrossed, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
];

// Three postures. A desktop back office gets a navy sidebar, so the workspace
// reads as one tool with the records in front. A tablet keeps the tabs in the
// header, and a phone carried around the floor has them at the bottom, in thumb
// reach (a single scrolling header row once pushed "Customers" off screen).
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

  const signOutLabel = signingOut ? 'Signing out…' : 'Log out';

  return (
    <div className="min-h-[100dvh] bg-paper text-ink lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-[calc(100dvh-var(--admin-bottom-inset,0px))] flex-col bg-primary text-surface lg:flex">
        <NavLink to="/admin" className="mx-3 mt-4 flex items-center gap-3 rounded-xl p-2">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface p-1">
            <img src={config.assets.logo} alt="" width={40} height={40} className="max-h-full w-auto" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-lg font-bold">{config.venue.name}</span>
            <span className="block text-xs font-semibold text-surface/65">Staff console</span>
          </span>
        </NavLink>

        <nav className="mt-6 flex flex-col gap-1 px-3" aria-label="Admin navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-bold transition-colors duration-150 ${
                  isActive ? 'bg-surface/[0.12] text-surface' : 'text-surface/70 hover:bg-surface/[0.06] hover:text-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-full bg-accent" />}
                  <Icon size={18} aria-hidden="true" className={isActive ? 'text-accent' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-surface/10 px-3 py-4">
          <NavLink
            to="/admin/security"
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors duration-150 ${
                isActive ? 'bg-surface/[0.12] text-surface' : 'text-surface/70 hover:bg-surface/[0.06] hover:text-surface'
              }`
            }
          >
            <ShieldCheck size={17} aria-hidden="true" />
            Account security
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-surface/70 transition-colors duration-150 hover:bg-surface/[0.06] hover:text-surface disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOut size={17} aria-hidden="true" />
            {signOutLabel}
          </button>
          {signOutError && (
            <p className="px-3 pt-1 text-sm font-medium text-accent" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-ink/10 bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
            <NavLink to="/admin" className="mr-auto flex items-center gap-2.5 rounded-lg">
              <img src={config.assets.logo} alt="" width={36} height={36} className="h-9 w-auto" />
              <span className="leading-tight">
                <span className="block font-display text-base font-bold text-primary">{config.venue.name}</span>
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
                    `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors ${
                      isActive ? 'bg-primary text-surface' : 'text-ink/65 hover:bg-paper hover:text-ink'
                    }`
                  }
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* One-time action, so it stays out of the four-slot mobile tab bar. */}
            <NavLink
              to="/admin/security"
              aria-label="Account security"
              className={({ isActive }) =>
                `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 font-display text-sm font-bold transition-colors ${
                  isActive ? 'border-primary bg-primary text-surface' : 'border-ink/15 text-ink hover:bg-paper'
                }`
              }
            >
              <ShieldCheck size={16} aria-hidden="true" />
            </NavLink>

            <button
              type="button"
              aria-label={signingOut ? 'Signing out' : 'Log out'}
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink/15 px-3.5 font-display text-sm font-bold text-ink transition-colors hover:bg-paper disabled:pointer-events-none disabled:opacity-40"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{signOutLabel}</span>
            </button>
          </div>
          {signOutError && (
            <p className="mx-auto max-w-7xl px-4 pb-3 text-right text-sm font-medium text-ink sm:px-6" role="alert">
              {signOutError}
            </p>
          )}
        </header>

        {/* Bottom padding clears the mobile tab bar. */}
        <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12 lg:px-8 lg:pt-7 xl:px-10">{children}</main>
      </div>

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
                `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-primary' : 'text-ink/65'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-accent/30' : ''}`}>
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
