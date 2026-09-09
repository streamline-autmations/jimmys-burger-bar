import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cardClass, controlClass, eyebrowClass, getErrorMessage } from './adminUtils';

// Two-factor for the staff console.
//
// Deliberately minimal: enrol once on a device, then never again. Supabase
// persists the session in localStorage and refreshes it automatically, so a
// signed-in browser stays signed in - the code is asked for at sign-in, not on
// every visit. Signing out or clearing site data is what brings it back.
//
// The safety property that matters: getAuthenticatorAssuranceLevel() only
// reports nextLevel 'aal2' once a factor is actually VERIFIED. So if enrolment
// never happens, nothing here ever demands a code and the console cannot lock
// its only user out.

export type AalState = {
  loading: boolean;
  /** Signed in, a verified factor exists, but this session has not been upgraded. */
  needsChallenge: boolean;
  /** A verified factor exists on the account. */
  hasFactor: boolean;
  refresh: () => void;
};

export const useAal = (session: unknown): AalState => {
  const [loading, setLoading] = useState(true);
  const [needsChallenge, setNeedsChallenge] = useState(false);
  const [hasFactor, setHasFactor] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;

    if (!session) {
      setLoading(false);
      setNeedsChallenge(false);
      setHasFactor(false);
      return;
    }

    setLoading(true);
    void supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data, error }) => {
        if (!active) return;
        // On any failure, fail OPEN rather than closed. A transient network
        // error must not stand between staff and the order queue mid-service;
        // the database is the real access boundary, not this check.
        if (error || !data) {
          setNeedsChallenge(false);
          setHasFactor(false);
        } else {
          setHasFactor(data.nextLevel === 'aal2');
          setNeedsChallenge(data.nextLevel === 'aal2' && data.currentLevel === 'aal1');
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNeedsChallenge(false);
        setHasFactor(false);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session, nonce]);

  return { loading, needsChallenge, hasFactor, refresh };
};

const CodeInput: React.FC<{
  value: string;
  onChange: (next: string) => void;
  id: string;
  label: string;
}> = ({ value, onChange, id, label }) => (
  <div>
    <label htmlFor={id} className="mb-2 block font-display text-sm font-bold">
      {label}
    </label>
    <input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      required
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
      className={`${controlClass} py-3 text-center font-mono text-2xl tracking-[0.4em] placeholder:text-ink/30`}
      placeholder="000000"
    />
  </div>
);

/** Shown in place of the console when the session needs upgrading to aal2. */
export const MfaChallenge: React.FC<{ onVerified: () => void }> = ({ onVerified }) => {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;
      const factor = factors?.totp?.find((item) => item.status === 'verified');
      if (!factor) throw new Error('No verified authenticator found on this account.');

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code,
      });
      if (verifyError) throw verifyError;
      onVerified();
    } catch (caught) {
      setError(getErrorMessage(caught));
      setCode('');
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className={`${cardClass} w-full max-w-md p-6 sm:p-8`}>
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-primary">
          <ShieldCheck size={22} aria-hidden="true" />
        </span>
        <p className={eyebrowClass}>Staff console</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-primary">Enter your code</h1>
        <p className="mt-2 text-ink/65">
          Open your authenticator app and enter the six digits it shows for Jimmy&apos;s.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <CodeInput id="mfa-code" label="Six-digit code" value={code} onChange={setCode} />

          {error && (
            <p className="rounded-xl border border-accent bg-accent/15 px-4 py-3 text-sm font-medium text-ink" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-display font-bold text-surface transition-colors hover:bg-primary/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            {busy && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {busy ? 'Checking…' : 'Continue'}
          </button>

          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="w-full text-sm font-semibold text-ink/65 underline underline-offset-4 hover:text-ink"
          >
            Sign in as someone else
          </button>
        </form>
      </div>
    </main>
  );
};

/** One-time enrolment. Reachable at /admin/security. */
export const AdminSecurity: React.FC = () => {
  const [phase, setPhase] = useState<'checking' | 'idle' | 'enrolling' | 'done'>('checking');
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (!active) return;
      if (listError) {
        setError(getErrorMessage(listError));
        setPhase('idle');
        return;
      }
      setPhase(data?.totp?.some((item) => item.status === 'verified') ? 'done' : 'idle');
    });
    return () => {
      active = false;
    };
  }, []);

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      // A previous abandoned attempt leaves an unverified factor behind, and
      // Supabase refuses a second enrolment while one exists. Clear those first
      // so retrying never dead-ends.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const stale of existing?.all?.filter((item) => item.status === 'unverified') ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data, error: enrolError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Staff console ${new Date().toISOString().slice(0, 10)}`,
      });
      if (enrolError) throw enrolError;
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
      setPhase('enrolling');
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!factorId || code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) throw verifyError;
      setPhase('done');
    } catch (caught) {
      setError(getErrorMessage(caught));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'checking') {
    return <p className="py-16 text-center text-ink/65" role="status">Checking your security settings…</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className={eyebrowClass}>Account security</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-primary">Two-factor sign-in</h1>

      {phase === 'done' && (
        <div className={`${cardClass} mt-6 flex items-start gap-3 p-5`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-primary">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-display font-bold text-primary">Two-factor is on</p>
            <p className="mt-1 text-sm text-ink/65">
              This browser stays signed in, so you will not be asked for a code again here.
              You will need your authenticator when you sign in on a new device, or after signing out.
            </p>
          </div>
        </div>
      )}

      {phase === 'idle' && (
        <div className={`${cardClass} mt-6 p-5 sm:p-6`}>
          <p className="text-ink/65">
            Adds a six-digit code from your phone to the staff sign-in. You set this up once
            per device and this browser will not ask again.
          </p>
          {error && (
            <p className="mt-4 rounded-xl border border-accent bg-accent/15 px-4 py-3 text-sm font-medium text-ink" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void begin()}
            disabled={busy}
            className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-display font-bold text-surface transition-colors hover:bg-primary/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
          >
            {busy && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {busy ? 'Starting…' : 'Set up two-factor'}
          </button>
        </div>
      )}

      {phase === 'enrolling' && (
        <div className={`${cardClass} mt-6 p-5 sm:p-6`}>
          <ol className="space-y-6">
            <li>
              <p className="font-display font-bold text-primary">1. Scan this with your authenticator app</p>
              <p className="mt-1 text-sm text-ink/65">
                Google Authenticator, 1Password, Authy - any of them work.
              </p>
              {qr && (
                <img
                  src={qr}
                  alt="QR code for setting up two-factor authentication"
                  className="mt-4 h-48 w-48 rounded-xl border border-ink/10 bg-white p-2"
                />
              )}
              {secret && (
                <p className="mt-3 text-sm text-ink/65">
                  Cannot scan? Enter this key instead:{' '}
                  <code className="break-all font-mono text-ink">{secret}</code>
                </p>
              )}
            </li>
            <li>
              <p className="font-display font-bold text-primary">2. Enter the code it shows</p>
              <form onSubmit={confirm} className="mt-4 space-y-4">
                <CodeInput id="mfa-enrol-code" label="Six-digit code" value={code} onChange={setCode} />
                {error && (
                  <p className="rounded-xl border border-accent bg-accent/15 px-4 py-3 text-sm font-medium text-ink" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-display font-bold text-surface transition-colors hover:bg-primary/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-40"
                >
                  {busy && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
                  {busy ? 'Confirming…' : 'Turn on two-factor'}
                </button>
              </form>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
