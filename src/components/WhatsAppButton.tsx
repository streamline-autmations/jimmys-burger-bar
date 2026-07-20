import React from 'react';
import { MessageCircle } from 'lucide-react';
import { config } from '../config';

export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={`https://wa.me/${config.venue.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform group"
      aria-label="Chat with us on WhatsApp"
    >
      <MessageCircle size={24} />
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-surface text-ink px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-ink/10">
        Chat with us
      </span>
    </a>
  );
};
