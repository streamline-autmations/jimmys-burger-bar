import { createClient } from 'npm:@supabase/supabase-js@2.109.0';
import { parseItn, confirmItn, sign, validHosts, verifyItn } from './verification.mjs';

// Deliberately restricted to the staging project in this slice.
const STAGING = 'cagcpwlzqpolojpgewtw';
const json = (body: unknown, status = 200, origin?: string) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}) },
});
const env = (name: string) => { const value = Deno.env.get(name); if (!value) throw Error('SERVER_CONFIGURATION'); return value; };
Deno.serve(async (request: Request) => {
  let origin: string | undefined; let route: string | undefined; let note = '';
  try {
    const base = env('SUPABASE_URL');
    if (new URL(base).hostname !== `${STAGING}.supabase.co`) throw Error('STAGING_ONLY');
    const db = createClient(base, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: settings, error: settingsError } = await db.from('app_settings').select('key,value').in('key', ['payments.provider','payments.mode','payments.restaurant','payments.site_url','payments.secret_names']);
    if (settingsError) throw Error('DATABASE_UNAVAILABLE');
    const settingsMap = Object.fromEntries((settings ?? []).map(({key,value}) => [key,value]));
    const names = settingsMap['payments.secret_names'] ? JSON.parse(settingsMap['payments.secret_names']) : {
      mode: 'PAYFAST_MODE', merchant_id: 'PAYFAST_MERCHANT_ID', merchant_key: 'PAYFAST_MERCHANT_KEY', passphrase: 'PAYFAST_PASSPHRASE',
    };
    const secret = (key: string) => {
      if (!/^[A-Z][A-Z0-9_]+$/.test(names[key] ?? '')) throw Error('SERVER_CONFIGURATION');
      return env(names[key]);
    };
    const mode = secret('mode');
    if (mode !== 'sandbox') throw Error('SANDBOX_ONLY');
    const merchantId = secret('merchant_id');
    const passphrase = secret('passphrase');
    const url = new URL(request.url);
    route = url.pathname.split('/').pop();
    if (route === 'checkout') {
      const site = new URL(settingsMap['payments.site_url']);
      if (site.protocol !== 'https:' || site.hostname.endsWith('.invalid') || site.origin !== settingsMap['payments.site_url']) throw Error('SERVER_CONFIGURATION');
      origin = site.origin;
      if (request.headers.get('origin') !== origin) return json({error:'BAD_ORIGIN'},403);
      if (request.method === 'OPTIONS') return json({},200,origin);
    }
    if (request.method !== 'POST') return json({error:'METHOD_NOT_ALLOWED'},405,origin);
    if (settingsMap['payments.provider'] !== 'payfast' || settingsMap['payments.mode'] !== mode || settingsMap['payments.restaurant'] !== 'jimmys-staging') throw Error('PAYMENTS_DISABLED');
    // Bound reads even when Content-Length is absent or dishonest.
    const reader = request.body?.getReader();
    if (!reader) throw Error('INVALID_PAYLOAD');
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const {value,done} = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw Error('INVALID_PAYLOAD'); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset=0; for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
    const body = new TextDecoder().decode(bytes);
    if (route === 'checkout') {
      const input = JSON.parse(body);
      if (typeof input.reference !== 'string' || input.reference.length > 100 || typeof input.contact !== 'string' || input.contact.length > 254 || input.restaurant !== 'jimmys-staging') throw Error('INVALID_PAYLOAD');
      const {data,error} = await db.rpc('begin_payment', {p_reference:input.reference,p_contact:input.contact,p_restaurant:input.restaurant,p_mode:mode});
      if (error) throw Error(error.message.match(/PAYMENT_[A-Z_]+|PAYMENTS_DISABLED|ORDERING_PAUSED/)?.[0] ?? 'DATABASE_UNAVAILABLE');
      const fields: Record<string,string> = {
        merchant_id:merchantId, merchant_key:secret('merchant_key'),
        // Payfast adds nothing to these, so the page it returns to must be told which order.
        return_url:`${origin}/track?ref=${encodeURIComponent(data.reference)}&pay=return`, cancel_url:`${origin}/track?ref=${encodeURIComponent(data.reference)}&pay=cancelled`,
        notify_url:`${base}/functions/v1/payfast/itn`,
        m_payment_id:data.reference, amount:Number(data.amount).toFixed(2), item_name:`${data.order_type === 'delivery' ? 'Delivery' : 'Collection'} ${data.reference}`,
      };
      fields.signature = sign(Object.entries(fields),passphrase,true);
      return json({action:'https://sandbox.payfast.co.za/eng/process',method:'POST',fields,expires_at:data.expires_at},200,origin);
    }
    if (route !== 'itn') return json({error:'NOT_FOUND'},404);
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw Error('INVALID_PAYLOAD');
    const entries = parseItn(body);
    const fields = Object.fromEntries(entries);
    // Measured on staging 2026-11-17: the gateway discards a client-supplied
    // x-forwarded-for and sends "sender, sender, edge", and Cloudflare sets
    // cf-connecting-ip itself (it refuses requests that supply one). The sender is
    // trusted only when both agree; anything else fails closed as BAD_SOURCE.
    const forwarded = (request.headers.get('x-forwarded-for') ?? '').split(',').map((hop) => hop.trim());
    const sourceIp = forwarded[0] && forwarded[0] === request.headers.get('cf-connecting-ip') ? forwarded[0] : '';
    note = `forwarded hops ${forwarded.length}`;
    const ips = (await Promise.all(validHosts.map(host => Deno.resolveDns(host,'A')))).flat();
    const {data:order,error:orderError} = await db.from('orders').select('order_no,total').eq('order_no',fields.m_payment_id ?? '').maybeSingle();
    if (orderError) throw Error('DATABASE_UNAVAILABLE');
    if (!order) throw Error('PAYMENT_NOT_FOUND');
    const verified = verifyItn(entries,{passphrase,merchantId,reference:order.order_no,amount:String(order.total),sourceIp,allowedIps:ips});
    await confirmItn(entries);
    // Keep the reconciliation payload, excluding the signature and guest PII.
    const raw = Object.fromEntries(entries.filter(([key]) => ['m_payment_id','pf_payment_id','payment_status','merchant_id','amount_gross','amount_fee','amount_net'].includes(key)));
    const {data,error} = await db.rpc('mark_order_paid',{p_reference:verified.m_payment_id,p_transaction:verified.pf_payment_id,p_status:verified.payment_status,p_amount:verified.amount_gross,p_raw:raw});
    if (error) throw Error('DATABASE_UNAVAILABLE');
    console.log('payfast itn', verified.m_payment_id, verified.pf_payment_id, verified.payment_status, data?.result);
    return json(data);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    // The code only: never the payload, which carries guest details.
    console.error('payfast', route, code, note);
    const safe = /^(BAD_SIGNATURE|BAD_SOURCE|BAD_MERCHANT|BAD_REFERENCE|AMOUNT_MISMATCH|INVALID_AMOUNT|INVALID_STATUS|INVALID_PAYLOAD|PAYMENT_[A-Z_]+|PAYMENTS_DISABLED|ORDERING_PAUSED|STAGING_ONLY|SANDBOX_ONLY|SERVER_CONFIGURATION|SERVER_VALIDATION_FAILED)$/.test(code);
    return json({error:safe ? code : 'TEMPORARY_FAILURE'}, safe ? 400 : 503, origin);
  }
});
