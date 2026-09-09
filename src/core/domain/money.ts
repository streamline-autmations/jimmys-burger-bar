// Money for Restaurant Direct.
//
// Two rules, both learned from the code this replaces:
//
// 1. Amounts are held as INTEGER MINOR UNITS (cents). The previous model stored
//    parsed floats and summed them, which is fine until a menu carries an odd
//    price and a large cart accumulates binary-fraction error. Config still
//    takes human decimals (120, 25.5) because a restaurant's menu should be
//    readable; the conversion happens once, at load.
//
// 2. Formatting is EXPLICIT, not locale-guessed. Intl.NumberFormat with
//    en-ZA/ZAR renders "R 120,00" - a non-breaking space and a comma decimal -
//    where Jimmy's menu, posters and receipts all read "R120". A product that
//    silently restyles a client's prices is broken, so the separators and
//    symbol position are configuration, not inference.

export type Minor = number;

export interface CurrencyConfig {
  /** ISO 4217, used for records and receipts rather than display. */
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimalSeparator: string;
  thousandsSeparator: string;
  /** Drop ".00" on whole amounts, the way printed menus write them. */
  hideZeroCents: boolean;
}

export const ZAR: CurrencyConfig = {
  code: 'ZAR',
  symbol: 'R',
  position: 'before',
  decimalSeparator: '.',
  thousandsSeparator: '',
  hideZeroCents: true,
};

/** Human decimal (120, 25.5) to minor units. Rounds, so 25.505 cannot leak. */
export const toMinor = (amount: number): Minor => {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
};

export const fromMinor = (minor: Minor): number => minor / 100;

export function createMoneyFormatter(currency: CurrencyConfig) {
  return function formatMoney(minor: Minor): string {
    const safe = Number.isFinite(minor) ? Math.round(minor) : 0;
    const negative = safe < 0;
    const abs = Math.abs(safe);
    const units = Math.floor(abs / 100);
    const cents = abs % 100;

    let whole = String(units);
    if (currency.thousandsSeparator) {
      whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
    }

    const showCents = !(currency.hideZeroCents && cents === 0);
    const body = showCents
      ? `${whole}${currency.decimalSeparator}${String(cents).padStart(2, '0')}`
      : whole;

    const signed = negative ? `-${body}` : body;
    return currency.position === 'before'
      ? `${currency.symbol}${signed}`
      : `${signed}${currency.symbol}`;
  };
}

/**
 * Reads a legacy display price like "R100" or "R25.50".
 * Retained only for migrating older stored data; new code takes numbers.
 */
export const parseLegacyPrice = (price: string): Minor => {
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return cleaned ? toMinor(parseFloat(cleaned)) : 0;
};
