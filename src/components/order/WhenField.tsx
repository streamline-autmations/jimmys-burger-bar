import React from 'react';

export type WhenMode = 'asap' | 'later';

const option =
  'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-ink/15 bg-surface px-4 py-3 ' +
  'has-[:checked]:border-ink has-[:checked]:bg-accent/15 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50';

const Radio: React.FC<{ checked: boolean; onChange: () => void; title: string; sub?: React.ReactNode }> = ({ checked, onChange, title, sub }) => (
  <label className={option}>
    <input type="radio" name="when" checked={checked} onChange={onChange} className="h-5 w-5 shrink-0 accent-primary" />
    <span>
      <span className="block font-display font-bold text-ink">{title}</span>
      {sub && <span className="block text-sm font-medium text-ink/70">{sub}</span>}
    </span>
  </label>
);

/**
 * "As soon as possible" is the default and needs no date. "Schedule for later"
 * opens the day and time pickers, passed in as children. When ASAP cannot be
 * offered (closed, delivery not running, a cut-off passed) it is not shown at all:
 * the note says why and when, and the pickers are already on the next open slot.
 */
export const WhenField: React.FC<{
  mode: WhenMode;
  /** The estimated ready time, or undefined when ASAP is not on offer. */
  asapTime?: string;
  /** Why ASAP is not on offer, and when the next time is. */
  unavailableNote?: string;
  readyWord: string;
  onChoose: (mode: WhenMode) => void;
  children: React.ReactNode;
}> = ({ mode, asapTime, unavailableNote, readyWord, onChoose, children }) => (
  <div className="space-y-3">
    {asapTime ? (
      <>
        <Radio checked={mode === 'asap'} onChange={() => onChoose('asap')} title="As soon as possible" sub={<>Estimated {readyWord} time <strong className="font-display text-ink">{asapTime}</strong></>} />
        <Radio checked={mode === 'later'} onChange={() => onChoose('later')} title="Schedule for later" sub="Pick a day and time" />
      </>
    ) : unavailableNote && (
      <p role="status" className="rounded-xl bg-accent/20 px-4 py-3 text-sm font-semibold text-ink ring-1 ring-accent/60">{unavailableNote}</p>
    )}
    {mode === 'later' && <div className="space-y-4 pt-1">{children}</div>}
  </div>
);
