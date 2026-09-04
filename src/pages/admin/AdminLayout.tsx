import React, { useState } from 'react';
import { LayoutDashboard, LogOut, ShoppingBag, Users, UtensilsCrossed } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', label: 'Bookings', icon: UtensilsCrossed, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
];

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
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <NavLink to="/admin" className="mr-auto font-display text-xl font-bold text-primary">
            Jimmy&apos;s Admin
          </NavLink>

          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Admin navigation">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
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
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2 font-display text-sm font-bold text-ink transition-colors hover:bg-paper disabled:pointer-events-none disabled:opacity-40"
          >
            <LogOut size={16} aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
        {signOutError && (
          <p className="mx-auto max-w-7xl px-4 pb-3 text-right text-sm text-red-700 sm:px-6 lg:px-8" role="alert">
            {signOutError}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};
