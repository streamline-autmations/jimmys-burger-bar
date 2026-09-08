import React, { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { cardClass, controlClass, eyebrowClass } from './adminUtils';

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
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className={`${cardClass} w-full max-w-md p-6 sm:p-8`}>
        <img src="/images/logo.png" alt="Jimmy's Burger Bar" width={72} height={72} className="mb-6 h-16 w-auto" />
        <p className={eyebrowClass}>Staff console</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Sign in</h1>
        <p className="mt-2 text-ink/65">Use the staff administrator account.</p>

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
              className={`${controlClass} py-3 placeholder:text-ink/65`}
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
              className={`${controlClass} py-3 placeholder:text-ink/65`}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-accent bg-accent/15 px-4 py-3 text-sm font-medium text-ink" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-display font-bold text-surface transition-colors hover:bg-primary/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            {submitting && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
};
