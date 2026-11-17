import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { importVapidKey, pushEndpoint, vapidHeaders } from './vapid.mjs';

// GET: the VAPID public key, for the kitchen screen's opt-in.
// POST {order_id}: called by queue_order_push (pg_net) when an order becomes
// paid. It claims the order_push row first, so it sends at most once per order
// however often it is called; a caller who did not come from the trigger finds
// nothing to claim. The push has no payload: the device shows generic text.

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw Error('SERVER_CONFIGURATION'); return value; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request: Request) => {
  try {
    const publicKey = env('VAPID_PUBLIC_KEY');
    if (request.method === 'OPTIONS') return json({});
    if (request.method === 'GET') return json({ publicKey });
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const body = await request.text();
    if (body.length > 1024) return json({ error: 'INVALID_PAYLOAD' }, 400);
    let orderId: unknown;
    try { orderId = JSON.parse(body)?.order_id; } catch { /* falls through */ }
    if (typeof orderId !== 'string' || !UUID.test(orderId)) return json({ error: 'INVALID_PAYLOAD' }, 400);

    // Everything that can fail runs BEFORE the claim, so a failure leaves the
    // order unsent and a later call can still deliver it.
    const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const key = await importVapidKey(publicKey, env('VAPID_PRIVATE_KEY'));
    const subject = env('VAPID_SUBJECT');
    const { data: rows, error: readError } = await db.from('staff_push_subscriptions').select('endpoint');
    if (readError) throw Error('DATABASE_UNAVAILABLE');

    const { data: claimed, error: claimError } = await db.from('order_push').update({ sent_at: new Date().toISOString() })
      .eq('order_id', orderId).is('sent_at', null).select('order_id');
    if (claimError) throw Error('DATABASE_UNAVAILABLE');
    if (!claimed?.length) return json({ result: 'nothing_to_send' });

    let delivered = 0; let failed = 0; const gone: string[] = [];
    await Promise.all((rows ?? []).map(async ({ endpoint }) => {
      if (!pushEndpoint(endpoint)) { failed += 1; return; }
      try {
        // Empty body, so the runtime sends Content-Length: 0 (push services refuse a POST without one).
        const response = await fetch(endpoint, { method: 'POST', body: new Uint8Array(0), headers: await vapidHeaders({ endpoint, key, publicKey, subject }), signal: AbortSignal.timeout(8000) });
        if (response.ok) delivered += 1;
        else {
          failed += 1;
          // 404/410: the browser dropped this subscription (unsubscribed, site data cleared).
          if (response.status === 404 || response.status === 410) gone.push(endpoint);
          console.log(JSON.stringify({ event: 'push_refused', status: response.status, host: new URL(endpoint).hostname }));
        }
      } catch {
        failed += 1;
      }
    }));
    if (gone.length) await db.from('staff_push_subscriptions').delete().in('endpoint', gone);
    await db.from('order_push').update({ delivered, failed }).eq('order_id', orderId);
    console.log(JSON.stringify({ event: 'push_sent', delivered, failed, removed: gone.length }));
    return json({ result: 'sent', delivered, failed });
  } catch (failure) {
    const code = failure instanceof Error && /^[A-Z_]+$/.test(failure.message) ? failure.message : 'INTERNAL';
    console.log(JSON.stringify({ event: 'push_error', code }));
    return json({ error: code }, 500);
  }
});
