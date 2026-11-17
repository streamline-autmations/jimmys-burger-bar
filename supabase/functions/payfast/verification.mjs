// Payfast Custom Integration steps 2 and 4, retrieved 2026-11-16:
// https://developers.payfast.co.za/docs#step_4_confirm_payment
import { Buffer } from 'node:buffer'; // not a global in the Edge runtime
import { createHash, timingSafeEqual } from 'node:crypto';

export const validHosts = ['www.payfast.co.za', 'w1w.payfast.co.za', 'w2w.payfast.co.za', 'sandbox.payfast.co.za'];
// PHP urlencode: uppercase hex, spaces as +, including ! ' ( ) * ~ encoding.
const encode = (s) => encodeURIComponent(s).replace(/[!'()*~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()).replace(/%20/g, '+');
// Payfast trims checkout values before signing but signs ITN values exactly as posted.
export function parameterString(entries, checkout = false) {
  return entries.filter(([k, v]) => k !== 'signature' && (!checkout || v.trim() !== ''))
    .map(([k, v]) => `${k}=${encode(checkout ? v.trim() : v)}`).join('&');
}
export function sign(entries, passphrase, checkout = false) {
  return createHash('md5').update(parameterString(entries, checkout) + '&passphrase=' + encode(passphrase.trim())).digest('hex');
}
export function parseItn(body) {
  const entries = [...new URLSearchParams(body)];
  if (!entries.length || entries.length > 80 || new Set(entries.map(([k]) => k)).size !== entries.length || entries.some(([k,v]) => !/^[a-z][a-z0-9_]*$/.test(k) || v.length > 4096)) throw Error('INVALID_PAYLOAD');
  return entries;
}
export function cents(value) {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(value))) throw Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = String(value).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function verifyItn(entries, { passphrase, merchantId, reference, amount, sourceIp, allowedIps }) {
  const data = Object.fromEntries(entries);
  const signature = data.signature ?? '';
  if (!/^[a-f0-9]{32}$/.test(signature) || !timingSafeEqual(Buffer.from(signature), Buffer.from(sign(entries, passphrase)))) throw Error('BAD_SIGNATURE');
  if (!sourceIp || !allowedIps.includes(sourceIp)) throw Error('BAD_SOURCE');
  if (data.merchant_id !== merchantId) throw Error('BAD_MERCHANT');
  if (data.m_payment_id !== reference) throw Error('BAD_REFERENCE');
  if (!/^\d+$/.test(data.pf_payment_id ?? '') || !['COMPLETE', 'CANCELLED'].includes(data.payment_status)) throw Error('INVALID_STATUS');
  if (cents(data.amount_gross) !== cents(amount)) throw Error('AMOUNT_MISMATCH');
  return data;
}

export async function confirmItn(entries, fetcher = fetch) {
  const response = await fetcher('https://sandbox.payfast.co.za/eng/query/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parameterString(entries), redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || await response.text() !== 'VALID') throw Error('SERVER_VALIDATION_FAILED');
}
