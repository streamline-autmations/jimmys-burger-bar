import React from 'react';
import { RotateCw } from 'lucide-react';
import { config } from '../config';
import { copy } from '../core/tenant';

interface Props {
  children: React.ReactNode;
  /** Changing this clears a caught error, e.g. the route path, so navigating away recovers. */
  resetKey?: string;
  /** 'page' for the customer site, 'console' for the staff tool. */
  variant?: 'page' | 'console';
}

interface State {
  error: Error | null;
}

/** A deploy replaces hashed chunks, so a tab opened before it can fail to load the next page. */
const isStaleChunk = (error: Error): boolean =>
  /dynamically imported module|Failed to fetch dynamically|Importing a module script failed|ChunkLoadError/i.test(
    error.message,
  );

/**
 * Catches a render crash and shows a way forward instead of a blank white page.
 *
 * Before this there was no boundary anywhere, so one bad render - or a lazy
 * route chunk missing after a deploy - unmounted the whole app, including the
 * phone number a hungry customer would need to order another way.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isStaleChunk(error);
    const consoleVariant = this.props.variant === 'console';

    return (
      <div
        role="alert"
        className={`${consoleVariant ? 'min-h-[100dvh] bg-paper' : 'min-h-[70dvh] pt-28'} flex flex-col items-center justify-center px-5 pb-24 text-center text-ink`}
      >
        <span className="font-script text-2xl text-primary">sorry about that</span>
        <h1 className="mt-1 max-w-lg font-display text-3xl font-extrabold md:text-5xl">
          {stale ? 'This page has been updated' : copy.crash.heading}
        </h1>
        <p className="mt-4 max-w-md text-lg text-ink/70">
          {stale ? 'A newer version of the site is available. Reload to continue.' : copy.crash.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-display font-bold text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <RotateCw size={17} aria-hidden="true" />
            Reload page
          </button>
          {!consoleVariant && (
            <a
              href={`tel:${config.venue.phone.replace(/\s/g, '')}`}
              className="inline-flex min-h-12 items-center rounded-full border border-ink/20 bg-surface px-6 font-display font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Call {config.venue.name}
            </a>
          )}
        </div>
      </div>
    );
  }
}
