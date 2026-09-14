import React, { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MessageCircle, Phone, RotateCw, Search, WifiOff } from 'lucide-react';
import { config } from '../../config';
import type { SubmissionFailure } from '../../core/data';

const phoneHref = `tel:${config.venue.phone.replace(/\s/g, '')}`;
const whatsappHref = (text: string) => `https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(text)}`;

const secondaryAction =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-surface px-4 font-display text-sm font-bold text-ink hover:bg-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/**
 * What the customer sees when a send fails, shaped by whether anything saved.
 *
 * Uncertain: the request may have landed, so the primary action re-sends the
 * exact same request under the same reference (the server ignores a repeat),
 * and "check status" is offered alongside. Rejected or throttled: nothing was
 * saved, so the message says so plainly and the form stays editable.
 */
export const SubmissionNotice = forwardRef<HTMLDivElement, {
  kind: SubmissionFailure;
  offline: boolean;
  message: string;
  reference: string;
  /** "order" or "booking", used in the contact message. */
  noun: string;
  retrying: boolean;
  onRetry: () => void;
  /** Uncertain only: abandon this attempt and edit the form, accepting the duplicate risk. */
  onDiscard?: () => void;
}>(({ kind, offline, message, reference, noun, retrying, onRetry, onDiscard }, ref) => {
  const uncertain = kind === 'uncertain';
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-2xl border-2 border-ink bg-accent/15 p-4 text-left text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 sm:p-5"
    >
      <p className="flex items-start gap-2 font-display text-base font-bold">
        {offline ? <WifiOff size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
        <span>
          {offline ? 'You seem to be offline' : uncertain ? `We could not confirm your ${noun} arrived` : `This ${noun} was not sent`}
        </span>
      </p>
      <p className="mt-2 text-sm leading-relaxed">{message}</p>
      {uncertain && (
        <p className="mt-2 text-sm leading-relaxed">
          Trying again is safe. It uses the same reference, <span className="break-all font-bold">{reference}</span>, so {config.venue.name} will not get it twice.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {uncertain && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-display text-sm font-bold text-surface disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
          >
            <RotateCw size={16} className={retrying ? 'animate-spin' : ''} aria-hidden="true" />
            {retrying ? 'Trying again…' : 'Try again'}
          </button>
        )}
        {uncertain && (
          <Link to={`/track?ref=${encodeURIComponent(reference)}`} className={secondaryAction}>
            <Search size={16} aria-hidden="true" />
            Check status
          </Link>
        )}
        {kind === 'throttled' ? (
          <a href={phoneHref} className={secondaryAction}>
            <Phone size={16} aria-hidden="true" />
            Call {config.venue.phone}
          </a>
        ) : (
          <a
            href={whatsappHref(uncertain
              ? `Hi, please check whether my ${noun} ${reference} came through. This is not a new ${noun}.`
              : `Hi, I tried to send a ${noun} online and it did not go through.`)}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryAction}
          >
            <MessageCircle size={16} aria-hidden="true" />
            WhatsApp {config.venue.name}
          </a>
        )}
      </div>

      {uncertain && onDiscard && (
        <div className="mt-4 border-t border-ink/15 pt-3 text-sm">
          {confirmingDiscard ? (
            <div role="group" aria-label={`Change this ${noun}`}>
              <p className="font-semibold">If this {noun} did get through, sending a changed one creates a second {noun}. Check status first if you can.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={onDiscard} className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 font-display font-bold text-surface">
                  Change it anyway
                </button>
                <button type="button" onClick={() => setConfirmingDiscard(false)} className={secondaryAction}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmingDiscard(true)} className="min-h-11 font-display font-bold text-primary underline underline-offset-2">
              I need to change something
            </button>
          )}
        </div>
      )}
    </div>
  );
});
SubmissionNotice.displayName = 'SubmissionNotice';

/**
 * Shown when this tab sent a request earlier that was never confirmed, e.g. the
 * page was reloaded mid-send. Replaces a window.confirm() gate, which blocked
 * the page and could not offer a status check.
 */
export const UnconfirmedRequest: React.FC<{
  noun: string;
  reference: string;
  onStartAgain: () => void;
  className?: string;
}> = ({ noun, reference, onStartAgain, className = '' }) => {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`mx-auto max-w-xl px-5 ${className}`}>
      <span className="font-script text-2xl text-primary">one moment</span>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-ink md:text-4xl">Check your last {noun}</h1>
      <p className="mt-4 text-ink/75">
        This tab started sending a {noun} that we never got a confirmation for. It may have reached {config.venue.name}.
        Check its status before sending another, so you do not end up with two.
      </p>
      <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm ring-1 ring-ink/10">
        Reference <span className="block break-all font-display text-base font-bold text-primary">{reference}</span>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to={`/track?ref=${encodeURIComponent(reference)}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-display font-bold text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
        >
          <Search size={17} aria-hidden="true" />
          Check status
        </Link>
        <a
          href={whatsappHref(`Hi, please check whether my ${noun} ${reference} came through. This is not a new ${noun}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryAction}
        >
          <MessageCircle size={16} aria-hidden="true" />
          Ask on WhatsApp
        </a>
      </div>

      <div className="mt-8 border-t border-ink/10 pt-5">
        {confirming ? (
          <div role="group" aria-label={`Start a new ${noun}`} className="rounded-2xl bg-accent/15 p-4 text-sm text-ink ring-1 ring-accent/50">
            <p className="font-semibold">If the last {noun} did get through, starting again could send a second one. Continue?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onStartAgain} className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 font-display font-bold text-surface">
                Yes, start a new {noun}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={secondaryAction}>
                Go back
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 font-display text-sm font-bold text-primary underline underline-offset-2">
            I have checked. Start a new {noun}
          </button>
        )}
      </div>
    </div>
  );
};
