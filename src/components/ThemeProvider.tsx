import { useEffect } from 'react';
import { config } from '../config';

// Converts "#RRGGBB" to "R G B" so Tailwind's rgb(var(--x) / <alpha-value>)
// color functions can apply opacity utilities (e.g. bg-primary/10).
function hexToChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement.style;
    const { colors, fonts } = config.theme;

    root.setProperty('--color-primary', hexToChannels(colors.primary));
    root.setProperty('--color-secondary', hexToChannels(colors.secondary));
    root.setProperty('--color-ink', hexToChannels(colors.ink));
    root.setProperty('--color-paper', hexToChannels(colors.paper));
    root.setProperty('--color-surface', hexToChannels(colors.surface));
    root.setProperty('--color-accent', hexToChannels(colors.accent));
    root.setProperty('--font-display', fonts.display);
    root.setProperty('--font-body', fonts.body);
    root.setProperty('--font-script', fonts.script);
  }, []);

  return children as React.ReactElement;
};
