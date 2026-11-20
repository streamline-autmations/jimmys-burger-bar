import React from 'react';
import { MessageCircle } from 'lucide-react';
import { config } from '../config';
import { formatCartMoney } from '../lib/cartStore';
import { describeLine } from '../core/menu/extras';

/**
 * The way out when online payment is not working for a guest. The label and
 * the message both say what this is: a message asking for an order, with no
 * payment behind it. It must never read as a paid or confirmed order.
 */
export const WhatsAppFallback: React.FC<{ lines: { name: string; qty: number; extras?: unknown }[]; total?: number; className?: string }> = ({ lines, total, className = '' }) => {
  const text = [
    'Hi, I would like to order for collection. I have NOT paid online, so this is a request and not a paid order.',
    ...(lines.length ? ['', ...lines.map((line) => describeLine(line, 'x'))] : []),
    ...(lines.length && total !== undefined ? ['', `Website total: ${formatCartMoney(total)}`] : []),
  ].join('\n');
  return (
    <div className={className}>
      <a
        href={`https://wa.me/${config.venue.whatsapp}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink/20 bg-surface px-4 font-display text-sm font-bold text-ink hover:bg-paper"
      >
        <MessageCircle size={16} aria-hidden="true" /> Ask {config.venue.name} on WhatsApp instead
      </a>
      <p className="mt-2 text-sm text-ink/75">
        This sends your order as a WhatsApp message. It is not a paid order, and nothing is confirmed until {config.venue.name} replies.
      </p>
    </div>
  );
};
