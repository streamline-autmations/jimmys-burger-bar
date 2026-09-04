import React, { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle, LockKeyhole } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cardClass } from './adminUtils';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate('/admin', { replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    navigate('/admin', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className={`${cardClass} w-full max-w-md`}>
        <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-surface">
          <LockKeyhole size={22} aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-bold text-primary">Jimmy&apos;s Admin</h1>
        <p className="mt-2 text-ink/60">Sign in with the staff administrator account.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="admin-email" className="mb-2 block font-display text-sm font-bold">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block font-display text-sm font-bold">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-paper/60 border border-ink/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 bg-primary text-surface px-5 py-2.5 rounded-full font-display font-bold disabled:opacity-40 disabled:pointer-events-none"
          >
            {submitting && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
};
