import type { RestaurantConfig } from '../config/types';

export type EmailBrand = Pick<RestaurantConfig, 'venue' | 'theme' | 'assets' | 'timezone' | 'locale' | 'currency'>;
export type EmailRow = [label: string, value: string];

export interface EmailCopy {
  subject: string;
  heading: string;
  reference: string;
  message: string;
  details?: EmailRow[];
  items?: EmailRow[];
  total?: string;
  action?: { label: string; url: string };
  optOut?: string;
}

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escape = (value: string) => value.replace(/[&<>"']/g, char => entities[char]);

export function httpsUrl(value: string) {
  // n8n's Code node has no global URL constructor. Only absolute HTTPS links
  // to DNS hostnames are needed in email. Reject credentials and ambiguous paths.
  const match = /^(https:\/\/[a-z0-9.-]+(?::[0-9]+)?)(?:[/?#][^\s\\\x00-\x1f]*)?$/i.exec(value);
  if (!match) throw new Error('Expected an absolute HTTPS URL');
  return { origin: match[1], href: value };
}

/** All customer-provided text passes through escape() at the HTML boundary. */
export function renderEmailLayout(brand: EmailBrand, origin: string, copy: EmailCopy) {
  const { venue, theme } = brand;
  const { ink, surface, accent, paper } = theme.colors;
  const name = [venue.name, venue.nameSuffix].filter(Boolean).join(' ');
  const subject = copy.subject.replace(/[\r\n]+/g, ' ').trim();
  const logo = httpsUrl(brand.assets.logo.startsWith('/') ? origin + brand.assets.logo : brand.assets.logo).href;
  const whatsapp = 'https://wa.me/' + venue.whatsapp;
  const bodyFont = theme.fonts.body.replace('sans-serif', 'Arial, sans-serif');
  const displayFont = theme.fonts.display.replace('sans-serif', 'Trebuchet MS, Arial, sans-serif');
  const bodyStyle = 'font-size:16px;line-height:1.5;overflow-wrap:anywhere;word-break:break-word';
  const section = (rows: EmailRow[], label: string, amounts = false) => `<table width="100%" cellspacing="0" cellpadding="0" aria-label="${escape(label)}" style="width:100%;border-collapse:collapse;table-layout:fixed;margin:8px 0 18px">
    ${rows.map(([key, val]) => `<tr><th class="mail-cell" scope="row" align="left" valign="top" width="${amounts ? '72%' : '36%'}" style="border-bottom:1px solid ${ink};padding:10px 10px 10px 0;font-weight:${amounts ? 400 : 700};${bodyStyle}">${escape(key)}</th><td class="mail-cell" valign="top" align="${amounts ? 'right' : 'left'}" style="border-bottom:1px solid ${ink};padding:10px 0;${bodyStyle}">${escape(val)}</td></tr>`).join('')}
  </table>`;
  const { action, optOut } = copy;
  // Apple Mail uses the media query. Outlook apps may instead annotate
  // the message wrapper. Keep these rules in sync and leave light styles inline.
  const darkRules = [
    ['.mail-page', 'background-color:#10192a!important'],
    ['.mail-card', `background-color:${ink}!important;color:${paper}!important;border-color:#647086!important`],
    ['.mail-mast', 'background-color:#10192a!important'],
    ['.mail-logo', `background-color:${surface}!important;color:${ink}!important;border-radius:4px`],
    ['.mail-locality', `color:${paper}!important`],
    ['.mail-banner', `background-color:#10192a!important;border-color:${accent}!important`],
    ['.headline', `color:${surface}!important`],
    ['.mail-ref', `color:${accent}!important`],
    ['.mail-body', `background-color:${ink}!important;color:${paper}!important`],
    ['.mail-cell', `color:${paper}!important;border-color:#647086!important`],
    ['.mail-button', `background-color:${accent}!important;color:${ink}!important`],
    ['.mail-footer', `background-color:#10192a!important;color:${paper}!important;border-color:#647086!important`],
    ['.mail-link', `color:${accent}!important`],
  ];
  const darkCss = (prefix: string) => darkRules.map(([selector, rules]) => prefix + selector + '{' + rules + '}').join('\n');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${escape(subject)}</title>
  <style>:root{color-scheme:light dark;supported-color-schemes:light dark}@media(prefers-color-scheme:dark){${darkCss('')}}${darkCss('[data-ogsc] ')}@media(max-width:520px){.outer{padding:0!important}.pad{padding-left:20px!important;padding-right:20px!important}.headline{font-size:32px!important}}</style></head>
  <body class="mail-page" style="margin:0;background:${paper};color:${ink};font-family:${bodyFont}">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(copy.message)}</div>
  <table class="mail-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${paper}"><tr><td align="center" class="outer" style="padding:32px 12px">
  <!--[if mso]><table role="presentation" width="580" align="center"><tr><td><![endif]-->
  <table class="mail-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${surface}" style="max-width:580px;border:1px solid ${ink};color:${ink};font-family:${bodyFont};text-align:left">
  <tr><td class="pad mail-mast" style="padding:13px 32px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><img class="mail-logo" src="${escape(logo)}" alt="${escape(name)}" width="100" style="display:block;width:100px;height:auto;color:${ink}"></td><td class="mail-locality" align="right" style="font-size:15px;font-weight:bold;color:${ink}">${escape(venue.locality)}</td></tr></table>
  </td></tr>
  <tr><td bgcolor="${ink}" class="pad mail-banner" style="padding:23px 32px 25px;border-bottom:6px solid ${accent}">
    <p class="mail-ref" style="margin:0 0 8px;color:${accent};font: bold 14px/1.5 Consolas,monospace;overflow-wrap:anywhere">${escape(copy.reference)}</p>
    <h1 class="headline" style="margin:0;font-family:${displayFont};color:${surface};font-size:38px;font-weight:800;line-height:1.12">${escape(copy.heading)}</h1>
  </td></tr>
  <tr><td class="pad mail-body" style="padding:23px 32px 26px;${bodyStyle}">
    <p style="margin:0 0 18px">${escape(copy.message)}</p>
    ${copy.details?.length ? section(copy.details, 'Details') : ''}
    ${copy.items ? `<h2 style="margin:23px 0 0;font: bold 21px/1.3 ${displayFont}">Order summary</h2>${section(copy.items, 'Order summary', true)}<p style="margin:4px 0 22px;text-align:right;font-size:19px;font-weight:bold">Total &nbsp; ${escape(copy.total!)}</p>` : ''}
    ${action ? `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td class="mail-button" bgcolor="${accent}" style="mso-padding-alt:12px 20px"><a class="mail-button" href="${escape(action.url)}" style="display:inline-block;padding:12px 20px;color:${ink};font-weight:bold;text-decoration:none">${escape(action.label)}</a></td></tr></table>` : ''}
  </td></tr>
  <tr><td class="pad mail-footer" bgcolor="${paper}" style="border-top:2px dashed ${ink};padding:18px 32px;color:${ink};font-size:15px;line-height:1.6">
    <strong>${escape(name)}</strong><br>${escape(venue.address)}<br><a class="mail-link" style="color:${ink}" href="tel:${venue.phone.replace(/[^+\d]/g, '')}">${escape(venue.phone)}</a> &nbsp;·&nbsp; <a class="mail-link" style="color:${ink}" href="${escape(whatsapp)}">WhatsApp</a>
    ${optOut ? `<br><a class="mail-link" style="color:${ink}" href="${escape(optOut)}">Stop review emails</a>` : ''}
  </td></tr></table><!--[if mso]></td></tr></table><![endif]-->
  </td></tr></table></body></html>`;
  const rowsText = (rows: EmailRow[]) => rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  const text = [name, copy.reference, copy.heading, copy.message, rowsText(copy.details ?? []),
    copy.items && ['Order summary', rowsText(copy.items), 'Total: ' + copy.total].join('\n'),
    action && `${action.label}: ${action.url}`, [name, venue.address, venue.phone, whatsapp].join('\n'),
    optOut && 'Stop review emails: ' + optOut].filter(Boolean).join('\n\n');
  return { subject, preheader: copy.message, html, text };
}
