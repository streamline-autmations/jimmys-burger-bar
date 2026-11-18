// VAPID (RFC 8292) for a push with no payload. No payload means no message
// encryption, so this needs only an ES256 signature from WebCrypto and runs the
// same in Deno (the Edge Function) and Node (the tests).

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

// Only real browser push services. A staff row cannot turn the function into a
// way to POST to an arbitrary address.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/, /\.notify\.windows\.com$/];

export function pushEndpoint(endpoint) {
  let url;
  try { url = new URL(endpoint); } catch { return null; }
  return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some((host) => host.test(url.hostname)) ? url : null;
}

/** publicKey: base64url 65-byte uncompressed P-256 point. privateKey: base64url 32-byte scalar. */
export async function importVapidKey(publicKey, privateKey) {
  let point; let scalar;
  try { point = unb64url(publicKey); scalar = unb64url(privateKey); } catch { throw Error('VAPID_KEYS_INVALID'); }
  if (point.length !== 65 || point[0] !== 4 || scalar.length !== 32) throw Error('VAPID_KEYS_INVALID');
  return crypto.subtle.importKey('jwk',
    { kty: 'EC', crv: 'P-256', x: b64url(point.slice(1, 33)), y: b64url(point.slice(33, 65)), d: privateKey, ext: false },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** Headers for one payload-less push. Urgency high: Android's Doze otherwise holds it. */
export async function vapidHeaders({ endpoint, key, publicKey, subject, ttl = 600, now = Date.now() }) {
  const enc = (value) => b64url(new TextEncoder().encode(JSON.stringify(value)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  return {
    Authorization: `vapid t=${unsigned}.${b64url(signature)}, k=${publicKey}`,
    TTL: String(ttl),
    Urgency: 'high',
    // A phone that was offline gets one alert for the backlog, not one per order.
    Topic: 'new-order',
  };
}
