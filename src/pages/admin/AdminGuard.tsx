import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import { AdminLoading } from './AdminStates';
import { MfaChallenge, useAal } from './AdminMfa';

// `bare` drops the console chrome, for the full-screen kitchen view.
export const AdminGuard: React.FC<React.PropsWithChildren<{ bare?: boolean }>> = ({ children, bare = false }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const aal = useAal(session);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setChecking(false);
      }
    }).catch(() => { if (active) { setSession(null); setChecking(false); } });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setChecking(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) return <AdminLoading label="Checking your session…" fullPage />;
  if (!session) return <Navigate to="/admin/login" replace />;

  // Only reached when a VERIFIED authenticator exists on the account, so an
  // account without two-factor set up is never blocked here.
  if (aal.loading) return <AdminLoading label="Checking your session…" fullPage />;
  if (aal.needsChallenge) return <MfaChallenge onVerified={aal.refresh} />;

  return bare ? <>{children}</> : <AdminLayout>{children}</AdminLayout>;
};
