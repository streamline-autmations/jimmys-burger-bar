import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';
import { config } from '../config';
import { copy } from '../core/tenant';
import { STAMP_EASE } from '../lib/motion';
import { dismissOffer, isStandalone, platformOf, promptInstall, readOffer, shouldOffer, useCanPrompt, type Placement } from '../lib/installApp';
import { Starburst } from './Starburst';
import { appShellActive } from '../lib/appShell';

// "Get the app" as one more sticker on the poster wall. Android: Chrome's own
// install dialog, or the signed app file when the tenant has one. iPhone: the
// Share, Add to Home Screen steps, because Safari gives sites no install prompt.
// Renders nothing on desktop, inside the installed app, or once dismissed.

export const InstallApp: React.FC<{ placement: Placement; className?: string }> = ({ placement, className = '' }) => {
  const platform = useMemo(() => (typeof navigator === 'undefined' ? 'other' : platformOf(navigator.userAgent, navigator.maxTouchPoints)), []);
  const [visible, setVisible] = useState(() => !isStandalone() && !appShellActive() && shouldOffer(readOffer(), placement, platform, Date.now()));
  const [steps, setSteps] = useState(false);
  const canPrompt = useCanPrompt();
  const apk = config.app?.androidApk;
  // Installed from the browser's own menu instead of the sticker: the sticker goes too.
  useEffect(() => {
    const hide = () => setVisible(false);
    window.addEventListener('appinstalled', hide);
    return () => window.removeEventListener('appinstalled', hide);
  }, []);

  if (!visible) return null;
  const floating = placement === 'return-visit';
  // Above the menu, or floating over a page, it stays one short strip. The full card is for right after an order.
  const compact = placement !== 'after-order';

  const install = async () => {
    if (await promptInstall()) setVisible(false);
  };
  const close = () => {
    dismissOffer();
    setVisible(false);
  };

  const action = 'inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-display font-bold text-ink';

  return (
    <motion.aside
      aria-label="Get the app"
      initial={{ opacity: 0, y: floating ? 24 : 0, scale: 0.94, rotate: -2 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ duration: 0.42, ease: STAMP_EASE, delay: floating ? 2.5 : 0.2 }}
      className={`${floating ? 'fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md shadow-2xl shadow-ink/30 ring-2 ring-accent' : 'relative'} rounded-2xl bg-primary ${compact ? 'p-4' : 'p-5'} pr-12 text-surface ${className}`}
    >
      <button type="button" onClick={close} aria-label="Not now" className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-surface/70 hover:text-surface">
        <X size={18} aria-hidden="true" />
      </button>
      <div className={`flex gap-4 ${compact ? 'items-center' : 'items-start'}`}>
        <div className="-ml-1 -mt-1 shrink-0 rotate-[-8deg]" aria-hidden="true">
          <Starburst label="get the" value="APP" className={compact ? 'h-12 w-12 text-[0.75rem]' : 'h-16 w-16 text-[0.95rem]'} />
        </div>
        <div className="min-w-0">
          <p className={`font-display font-extrabold leading-tight ${compact ? 'text-lg' : 'text-xl'}`}>{copy.app.heading}</p>
          {!compact && <p className="mt-1 text-sm text-surface/80">{copy.app.body}</p>}
        </div>
      </div>

      <div className={compact ? 'mt-3' : 'mt-4'}>
        {platform === 'android' && canPrompt && (
          <button type="button" onClick={() => void install()} className={action}>
            <Download size={17} aria-hidden="true" /> Install the app
          </button>
        )}
        {platform === 'android' && !canPrompt && (
          <>
            {apk && <a href={apk} download className={action}><Download size={17} aria-hidden="true" /> Download the Android app</a>}
            <p className={`${apk ? 'mt-3' : ''} text-sm text-surface/80`}>
              {apk ? 'Or in Chrome: ' : 'In Chrome: '}tap <span className="font-bold text-surface">⋮</span> at the top right, then <span className="font-bold text-surface">Install app</span> or <span className="font-bold text-surface">Add to Home screen</span>.
            </p>
          </>
        )}
        {platform === 'ios' && (steps ? (
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="w-4 shrink-0 font-display font-bold text-accent">1</span><span>Tap <Share size={15} className="inline -mt-1" aria-label="Share" /> <span className="font-bold">Share</span>. In Safari it is at the bottom; in Chrome, at the top right.</span></li>
            <li className="flex gap-2"><span className="w-4 shrink-0 font-display font-bold text-accent">2</span><span>Scroll down and tap <span className="font-bold">Add to Home Screen</span>.</span></li>
            <li className="flex gap-2"><span className="w-4 shrink-0 font-display font-bold text-accent">3</span><span>Tap <span className="font-bold">Add</span>. The icon opens straight to the menu.</span></li>
          </ol>
        ) : (
          <button type="button" onClick={() => setSteps(true)} className={action}>
            <Share size={17} aria-hidden="true" /> Show me how
          </button>
        ))}
      </div>
    </motion.aside>
  );
};
