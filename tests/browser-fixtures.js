// Playwright CLI run-code fixture. This file is outside the app's import graph.
// Run ONLY on localhost in a disposable browser session. Every external request
// is intercepted, every database write is simulated, and outbound links are inert.
async (page) => {
  page.setDefaultTimeout(10000);
  if (page.url() !== 'about:blank' && !/^http:\/\/(localhost|127\.0\.0\.1):/.test(page.url())) throw new Error('Local browser only');
  const now = new Date('2026-09-07T08:00:00Z');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const iso = new Date(`${today}T12:00:00+02:00`).toISOString();
  const base = { created_at: iso, updated_at: iso, email: 'fictional.guest@example.com', phone: '', marketing_consent: false };
  const orders = ['new','accepted','preparing','ready','completed','cancelled'].map((status, index) => ({ ...base, id: `00000000-0000-4000-8000-00000000000${index}`, order_no: `DEMO-00${index+1}`, customer_name: `Fictional Guest ${index+1}`, order_type: 'collection', table_number: null, delivery_address: null, delivery_notes: null, requested_time: iso, status, total: 200, order_items: [{ id: `item-${index}`, name: 'Smash Burger', qty: 2, unit_price: 100 }] }));
  const bookings = ['pending','confirmed','cancelled'].map((status,index) => ({...base, id: `10000000-0000-4000-8000-00000000000${index}`, name:`Fictional Booking Guest ${index+1}`, booking_date:today, booking_time:'18:00:00', guests:4, seating_preference:'No preference', notes:'Fictional request for interface testing.',status }));
  const customers = [{...base,id:'20000000-0000-4000-8000-000000000001',name:'Fictional Guest',last_interaction_at:iso,interaction_count:2}];
  for (const row of [...orders, ...bookings]) row.customer_id = customers[0].id;
  // Phase 3 submit scenarios, set with window.__submitState:
  //   'ok' (default) | 'uncertain-once' (first write 503s, retry succeeds) | 'rejected' | 'throttled'
  //   | 'uncertain-then-rejected' (first write 503s, the retry is refused) | 'menu-changed'
  let failedOnce = false;
  await page.context().route('**/*', async route => {
    const request=route.request(); const raw=request.url(); const parts=raw.split('/'); const url={hostname:parts[2].split(':')[0],pathname:'/'+parts.slice(3).join('/').split('?')[0],searchParams:new Map((raw.split('?')[1]||'').split('&').filter(Boolean).map(pair=>pair.split('=').map(decodeURIComponent)))};
    if (['127.0.0.1','localhost'].includes(url.hostname)) return route.continue();
    if (!url.hostname.endsWith('.supabase.co')) return route.abort();
    const state = await page.evaluate(() => window.__auditState || 'populated').catch(()=>'populated');
    if (state==='loading') await page.waitForTimeout(2500);
    if (state==='error') return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Simulated offline state'})});
    const table=url.pathname.split('/').pop();
    const submitState = await page.evaluate(() => window.__submitState || 'ok').catch(()=>'ok');
    const isWrite = request.method()==='POST' && ['create_order','bookings'].includes(table);
    if (isWrite && submitState==='uncertain-once' && !failedOnce) { failedOnce = true; return route.fulfill({status:503,contentType:'text/html',body:'<html>Bad gateway</html>'}); }
    if (isWrite && submitState==='uncertain-then-rejected') { if (!failedOnce) { failedOnce = true; return route.fulfill({status:503,contentType:'text/html',body:'<html>Bad gateway</html>'}); } return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'42501',message:'permission denied'})}); }
    if (isWrite && submitState==='menu-changed') return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'menu price changed: Smash Burger'})});
    if (isWrite && submitState==='rejected') return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'order total does not match its items'})});
    if (isWrite && submitState==='throttled') return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({code:'P0001',message:'too many booking requests from this contact. Please phone the restaurant.'})});
    if (request.method()==='POST' && table==='lookup_request') {
      const body = JSON.parse(request.postData()); const order = orders.find(o => o.order_no.toUpperCase() === String(body.p_reference).trim().toUpperCase());
      const match = order && String(body.p_contact).trim().toLowerCase() === order.email;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(match ? {kind:'order',reference:order.order_no,status:order.status,order_type:order.order_type,requested_time:order.requested_time,total:order.total,created_at:order.created_at,updated_at:order.updated_at,items:order.order_items.map(i=>({name:i.name,qty:i.qty}))} : null)});
    }
    if (request.method()==='POST' && table==='create_order') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:'30000000-0000-4000-8000-000000000001',order_no:JSON.parse(request.postData()).p_order_no,created_at:iso}])});
    if (request.method()==='POST' && table==='bookings') return route.fulfill({status:201,body:''});
    if (request.method()==='PATCH') {
      const source=table==='orders'?orders:bookings;const id=url.searchParams.get('id')?.slice(3); const row=source.find(row=>row.id===id);
      if(state==='conflict') return route.fulfill({status:200,contentType:'application/json',body:'[]'});
      if(row) Object.assign(row, JSON.parse(request.postData()));
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(row?[{id:row.id}]:[])});
    }
    let rows=state==='empty'?[]:[...(table==='orders'?orders:table==='bookings'?bookings:table==='customers'?customers:[])];
    for(const [key,value] of url.searchParams){
      if(value.startsWith('eq.'))rows=rows.filter(row=>String(row[key])===value.slice(3));
      if(value.startsWith('neq.'))rows=rows.filter(row=>String(row[key])!==value.slice(4));
      if(value.startsWith('gte.'))rows=rows.filter(row=>row[key]>=value.slice(4));
      if(value.startsWith('lt.'))rows=rows.filter(row=>row[key]<value.slice(3));
      if(value.startsWith('in.'))rows=rows.filter(row=>value.slice(4,-1).split(',').includes(row[key]));
      if(value.startsWith('not.in.'))rows=rows.filter(row=>!value.slice(8,-1).split(',').includes(row[key]));
    }
    return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','access-control-expose-headers':'content-range','content-type':'application/json','content-range':`0-${Math.max(0,rows.length-1)}/${rows.length}`},body:request.method()==='HEAD'?'':JSON.stringify(rows)});
  });
  await page.addInitScript(() => {
    const NativeDate = window.Date;
    const offset = new NativeDate('2026-09-07T08:00:00Z').getTime() - NativeDate.now();
    window.Date = class extends NativeDate {
      constructor(...args) { if (args.length) super(...args); else super(NativeDate.now() + offset); }
      static now() { return NativeDate.now() + offset; }
    };
    window.__auditState='populated';
    const session={access_token:'local-fixture-token',refresh_token:'local-fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'00000000-0000-4000-8000-000000000099',aud:'authenticated',role:'authenticated',email:'fictional.staff@example.com'}};
    localStorage.setItem('sb-iqxxmvitbuxlpncpjzkx-auth-token',JSON.stringify(session));
    document.addEventListener('click',event=>{const a=event.target.closest?.('a');if(a && !a.href.startsWith(location.origin)){event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('DOMContentLoaded',()=>{const badge=document.createElement('div');badge.textContent='Demo data • local browser fixtures • no messages sent';badge.style='position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#F2A93B;color:#172544;font:bold 11px sans-serif;text-align:center;padding:4px;pointer-events:none';document.body.append(badge);const style=document.createElement('style');style.textContent='nav.fixed.bottom-0{bottom:20px}';document.head.append(style);});
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5177/admin/orders');
  await page.getByRole('heading',{name:'Orders',exact:true}).waitFor();
  await page.getByText('Fictional Guest 1',{exact:true}).waitFor();
  await page.screenshot({path:'/tmp/jimmys-admin-1440.png',fullPage:true});
  return {fixture:'ready',externalRequests:'all intercepted',rows:await page.getByText('Fictional Guest 1',{exact:true}).count()};
}
