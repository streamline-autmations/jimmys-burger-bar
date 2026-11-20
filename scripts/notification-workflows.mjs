// Build n8n definitions from the installed SMTP nodes and the same TypeScript
// renderer as the local previews. The caller supplies exports and site/project
// settings. This module never reads SMTP secrets or chooses a live recipient.
import { build } from 'vite';
import { randomUUID } from 'node:crypto';
import { load } from './lib/load-ts.mjs';

export async function notificationCode(siteUrl) {
  const { jimmys } = load('src/tenants/jimmys/config.ts');
  const { theme, assets, venue, timezone, locale, currency } = jimmys;
  const brand = { theme, assets: { logo: assets.logo }, venue: Object.fromEntries(
    ['name','nameSuffix','locality','address','phone','whatsapp','googleReviews','timeLabel'].map(k => [k, venue[k]])),
    timezone, locale, currency };
  const result = await build({ configFile: false, logLevel: 'silent',
    build: { write: false, minify: false, lib: { entry: 'src/core/notifications/emails.ts', name: 'Emails', formats: ['iife'] } } });
  const js = result[0].output[0].code;
  return js + '\nconst render = event => Emails.renderNotificationEmail(' + JSON.stringify(brand) + ', ' + JSON.stringify(new URL(siteUrl).origin) + ', event);\n';
}

const source = name => "$('" + name + "').item.json";
const expr = value => '={{ ' + value + ' }}';

function emailParams(node, mail, to, testInbox) {
  node.parameters = { ...node.parameters, emailFormat: 'both', toEmail: testInbox || to,
    subject: expr((testInbox ? "'[Staging] ' + " : '') + mail + '.subject'),
    html: expr(mail + '.html'), text: expr(mail + '.text'),
    options: { ...node.parameters.options, appendAttribution: false } };
}

export function receiptWorkflow(current, kind, code, { testInbox, path } = {}) {
  if (!['order','booking'].includes(kind)) throw Error('Unsupported receipt webhook');
  const { name, nodes, connections, settings } = structuredClone(current);
  const node = name => nodes.find(n => n.name === name);
  const format = node('Format');
  format.parameters.jsCode = code + `return $input.all().map(item => {
    const data = item.json.body;
    const event = {kind:'${kind === 'order' ? 'order.received' : 'booking.requested'}', ${kind}:data};
    return {json:{email:data.email,guest:render({...event,audience:'guest'}),staff:render({...event,audience:'staff'})}};
  });`;
  for (const [side, name] of [['guest','Customer Email'],['staff','Owner Email']]) {
    const n = node(name);
    emailParams(n, source('Format')+'.'+side, n.parameters.toEmail, testInbox);
  }
  if (testInbox) {
    if (!path) throw Error('A separate staging webhook path is required');
    node('Webhook').parameters.path = path;
    node('Webhook').webhookId = randomUUID();
  }
  return { name: name + (testInbox ? ' (staging emails)' : ''), nodes, connections, settings };
}

const edge = node => ({ node, type:'main', index:0 });
const next = name => ({ main: [[edge(name)]] });
const node = (name, type, parameters, x, y = 0, version = 1) => ({
  id:randomUUID(), name, type:'n8n-nodes-base.'+type, typeVersion:version, position:[x,y], parameters,
});

export function statusWorkflow(existingOrder, code, { path, restUrl, publicKey, testInbox }) {
  const rpc = (name, fn, body, x) => node(name, 'httpRequest', {
    method:'POST',url:new URL('/rest/v1/rpc/'+fn,restUrl).href,sendHeaders:true,
    headerParameters:{parameters:[{name:'apikey',value:publicKey}]},
    sendBody:true,specifyBody:'json',jsonBody:expr('JSON.stringify('+body+')'),options:{},
  },x,0,4.2);
  const webhook = node('Order update','webhook',{httpMethod:'POST',path,responseMode:'onReceived',options:{}},0,0,2);
  webhook.webhookId=randomUUID();
  const claim = rpc('Claim ticket','claim_notification_email','{p_ticket:$json.body.ticket}',220);
  const format = node('Format','code',{jsCode:code+"return $input.all().filter(i=>i.json.event).map(i=>({json:{...i.json,mail:render(i.json.event)}}));"},440,0,2);
  const smtp = structuredClone(existingOrder.nodes.find(n=>n.name==='Customer Email'));
  smtp.name='Send email'; smtp.id=randomUUID(); smtp.position=[660,0];
  emailParams(smtp,source('Format')+'.mail',expr(source('Format')+'.recipient'),testInbox);
  const finish=rpc('Record delivery','finish_notification_email',"{p_receipt:"+source('Format')+".receipt}",880);
  return {name:"Jimmy's · Guest email updates"+(testInbox?' (staging)':''),nodes:[webhook,claim,format,smtp,finish],
    connections:{'Order update':next('Claim ticket'),'Claim ticket':next('Format'),Format:next('Send email'),'Send email':next('Record delivery')},
    settings:{executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none'}};
}

export function optOutWorkflow({path, webhookBase, restUrl, publicKey, staging}) {
  const get=node('Open preferences','webhook',{httpMethod:'GET',path,responseMode:'responseNode',options:{}},0,0,2);
  const post=node('Confirm opt-out','webhook',{httpMethod:'POST',path,responseMode:'responseNode',options:{}},0,220,2);
  get.webhookId=randomUUID();post.webhookId=randomUUID();
  const action=new URL('/webhook/'+path,webhookBase).href;
  const frame = body => '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review emails | Jimmy’s Burger Bar</title></head><body style="max-width:32rem;margin:12vh auto;padding:20px;font:18px/1.5 Arial,sans-serif;color:#172544">'+body+'</body></html>';
  const page=node('Review email preferences','code',{jsCode:`const token=$input.first().json.query?.token || ''; const valid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token);
    const form=${JSON.stringify(frame('<h1>Stop review emails?</h1><p>You’ll still receive updates about orders and bookings.</p><form method="post" action="'+action+'"><input type="hidden" name="token" value="TOKEN"><button style="padding:12px 18px;background:#f2a93b;color:#172544;border:0;font-size:17px">Stop review emails</button></form>'))};
    return [{json:{html:valid ? form.replace('TOKEN',token) : ${JSON.stringify(frame('<h1>Open the link in your review email</h1>'))}}}];`},220,0,2);
  const response=(name,body,x,y)=>node(name,'respondToWebhook',{respondWith:'text',responseBody:body,options:{responseHeaders:{entries:[{name:'Content-Type',value:'text/html; charset=utf-8'},{name:'Cache-Control',value:'no-store'},{name:'Referrer-Policy',value:'no-referrer'}]}}},x,y,1.4);
  const stop=node('Stop invitations','httpRequest',{method:'POST',url:new URL('/rest/v1/rpc/stop_review_emails',restUrl).href,sendHeaders:true,
    headerParameters:{parameters:[{name:'apikey',value:publicKey}]},sendBody:true,specifyBody:'json',jsonBody:expr('JSON.stringify({p_token:$json.body.token})'),options:{}},220,220,4.2);
  stop.alwaysOutputData=true;
  return {name:"Jimmy's · Review email preferences"+(staging?' (staging)':''),nodes:[get,page,response('Show form',expr('$json.html'),440,0),post,stop,response('Show confirmation',frame('<h1>Review emails stopped</h1><p>Your order and booking updates will still arrive.</p>'),440,220)],connections:{
    'Open preferences':next('Review email preferences'),'Review email preferences':next('Show form'),'Confirm opt-out':next('Stop invitations'),'Stop invitations':next('Show confirmation')},settings:{executionOrder:'v1',saveDataSuccessExecution:'none',saveDataErrorExecution:'none'}};
}
