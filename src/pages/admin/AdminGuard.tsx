import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from './AdminLayout';
import { AdminLoading } from './AdminStates';

export const AdminGuard: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setChecking(false);
      }
    });

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

  return <AdminLayout>{children}</AdminLayout>;
};
