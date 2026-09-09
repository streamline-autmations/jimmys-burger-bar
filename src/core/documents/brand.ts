import { config } from '../../config';

/**
 * Brand values for generated PDFs.
 *
 * The three generators each carried their own copy of the navy and gold as raw
 * RGB arrays, plus the venue name and, in one case, a street address duplicated
 * from config two lines below where config was already being read correctly.
 * Changing a client's palette meant finding all of them.
 */

type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb => {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

export const docInk: Rgb = toRgb(config.theme.colors.ink);
export const docAccent: Rgb = toRgb(config.theme.colors.accent);
export const docGray: Rgb = [140, 148, 165];

/** Uppercase wordmark used in document headers. */
export const docWordmark = config.venue.name.toUpperCase();

export const docLogo = config.assets.logo;

/** Loads the tenant logo as a data URI for embedding. */
export async function loadLogo(): Promise<string> {
  const response = await fetch(docLogo);
  if (!response.ok) throw new Error(`Unable to load logo (${response.status})`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read logo'));
    reader.readAsDataURL(blob);
  });
}
