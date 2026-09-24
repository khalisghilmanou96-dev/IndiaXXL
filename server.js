require('dotenv').config();
const express=require('express'),path=require('path'),fs=require('fs'),crypto=require('crypto'),helmet=require('helmet');

const app=express();
const PORT=Number(process.env.PORT||3000);
const BASE_URL=(process.env.BASE_URL||`http://localhost:${PORT}`).replace(/\/$/,'');
const PUBLIC=path.join(__dirname,'public');
const DATA=path.join(__dirname,'data');
const ORDER_FILE=path.join(DATA,'orders.json');
const PRODUCT_FILE=path.join(DATA,'products.json');
const DEMO_PAYMENT_MODE=String(process.env.DEMO_PAYMENT_MODE||'false').toLowerCase()==='true';
const STRIPE_SECRET_KEY=process.env.STRIPE_SECRET_KEY||'';
const STRIPE_WEBHOOK_SECRET=process.env.STRIPE_WEBHOOK_SECRET||'';
const DONATION_FILE=path.join(DATA,'donations.json');
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||'demo-admin-2026';
const ADMIN_SESSION_SECRET=process.env.ADMIN_SESSION_SECRET||'replace-with-a-long-random-secret';
const COOKIE='aurora_admin';
const SESSION_HOURS=8;

fs.mkdirSync(DATA,{recursive:true});
if(!fs.existsSync(ORDER_FILE))fs.writeFileSync(ORDER_FILE,'{}\n');
if(!fs.existsSync(DONATION_FILE))fs.writeFileSync(DONATION_FILE,'[]\n');
const products=JSON.parse(fs.readFileSync(PRODUCT_FILE,'utf8'));
const productMap=Object.fromEntries(products.map(p=>[p.id,p]));

app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:false}));

function validStripeSignature(raw,header,secret){
  if(!secret||!header)return false;
  const parts=Object.fromEntries(String(header).split(',').map(x=>x.split('=')));
  const t=parts.t,v1=parts.v1;if(!t||!v1)return false;
  if(Math.abs(Date.now()/1000-Number(t))>300)return false;
  const expected=crypto.createHmac('sha256',secret).update(`${t}.${raw.toString('utf8')}`).digest('hex');
  const a=Buffer.from(v1,'hex'),b=Buffer.from(expected,'hex');
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
app.post('/api/stripe-webhook',express.raw({type:'application/json'}),(req,res)=>{
  if(!validStripeSignature(req.body,req.headers['stripe-signature'],STRIPE_WEBHOOK_SECRET))return res.status(400).send('Invalid signature');
  let event;try{event=JSON.parse(req.body.toString('utf8'))}catch{return res.status(400).send('Invalid payload')}
  if(event.type==='checkout.session.completed'&&event.data?.object?.payment_status==='paid'){
    try{const list=JSON.parse(fs.readFileSync(DONATION_FILE,'utf8')||'[]');const x=event.data.object;if(!list.some(d=>d.sessionId===x.id)){list.push({sessionId:x.id,amount:x.amount_total,currency:x.currency,donorName:x.metadata?.donor_name||'',dedication:x.metadata?.dedication||'',paidAt:now()});fs.writeFileSync(DONATION_FILE,JSON.stringify(list,null,2))}}catch(e){console.error('Donation log error',e)}
  }
  res.json({received:true});
});
app.use(express.json({limit:'40kb'}));

async function stripeRequest(endpoint,options={}){
  if(!STRIPE_SECRET_KEY)throw new Error('Stripe is not configured');
  const r=await fetch(`https://api.stripe.com${endpoint}`,{...options,headers:{Authorization:`Bearer ${STRIPE_SECRET_KEY}`,...(options.headers||{})}});
  const d=await r.json();if(!r.ok)throw new Error(d?.error?.message||'Stripe request failed');return d;
}

app.post('/api/create-donation-checkout',async(req,res)=>{
  try{
    const amount=Math.round(Number(req.body?.amount));
    if(!Number.isFinite(amount)||amount<5||amount>500)return res.status(400).json({error:'Donation must be between $5 and $500.'});
    const donorName=String(req.body?.donorName||'').trim().slice(0,80),dedication=String(req.body?.dedication||'').trim().slice(0,120);
    const form=new URLSearchParams();
    form.set('mode','payment');form.set('success_url',`${BASE_URL}/merci.html?session_id={CHECKOUT_SESSION_ID}`);form.set('cancel_url',`${BASE_URL}/?payment=cancelled#give`);
    form.set('line_items[0][price_data][currency]','usd');form.set('line_items[0][price_data][unit_amount]',String(amount*100));form.set('line_items[0][price_data][product_data][name]','Gau Mata offering');form.set('line_items[0][quantity]','1');
    form.set('metadata[donor_name]',donorName);form.set('metadata[dedication]',dedication);form.set('metadata[frequency]',String(req.body?.frequency||'one-time').slice(0,40));
    const session=await stripeRequest('/v1/checkout/sessions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
    res.json({url:session.url,sessionId:session.id});
  }catch(e){console.error(e);res.status(500).json({error:STRIPE_SECRET_KEY?'Unable to create Stripe Checkout.':'Stripe is not configured on the server.'})}
});
app.get('/api/donation-status',async(req,res)=>{
  try{const id=String(req.query.session_id||'');if(!/^cs_/.test(id))return res.status(400).json({error:'Invalid session.'});const s=await stripeRequest('/v1/checkout/sessions/'+encodeURIComponent(id));res.set('Cache-Control','no-store');res.json({paid:s.payment_status==='paid',payment_status:s.payment_status,amount:s.amount_total,currency:s.currency})}catch(e){res.status(502).json({error:'Unable to verify payment.'})}
});

const clean=(v,n=160)=>String(v??'').replace(/[<>]/g,'').trim().slice(0,n);
const readOrders=()=>{try{return JSON.parse(fs.readFileSync(ORDER_FILE,'utf8')||'{}')}catch{return{}}};
const writeOrders=o=>{const tmp=ORDER_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(o,null,2));fs.renameSync(tmp,ORDER_FILE)};
const now=()=>new Date().toISOString();

app.get('/',(_req,res)=>res.sendFile(path.join(PUBLIC,'index.html')));
app.use(express.static(PUBLIC));

app.get('/api/health',(_req,res)=>res.json({ok:true,mode:DEMO_PAYMENT_MODE?'demo':'external',products:products.length}));
app.get('/api/products',(_req,res)=>res.json(products));

function normalizeCart(items){
  let amount=0; const normalized=[];
  for(const raw of Array.isArray(items)?items:[]){
    const p=productMap[clean(raw.id,80)];
    const qty=Math.max(1,Math.min(10,Number.parseInt(raw.qty,10)||1));
    if(!p)continue;
    normalized.push({id:p.id,name:p.name,subtitle:p.subtitle,price:p.price,qty,accent:p.accent});
    amount+=p.price*qty;
  }
  return {items:normalized,amount:Number(amount.toFixed(2))};
}
function publicOrder(o){
  return {
    orderId:o.orderId,status:o.status,paymentStatus:o.paymentStatus,items:o.items,amount:o.amount,currency:o.currency,
    customerName:`${o.customer.firstName} ${o.customer.lastName}`.trim(),email:o.customer.email,createdAt:o.createdAt,
    trackingNumber:o.trackingNumber||'',history:o.history||[],delivery:'Free'
  };
}

app.post('/api/orders',(req,res)=>{
  const calc=normalizeCart(req.body?.items);
  const c=req.body?.customer||{};
  const customer={
    firstName:clean(c.firstName,60),lastName:clean(c.lastName,60),email:clean(c.email,120).toLowerCase(),
    phone:clean(c.phone,40),address:clean(c.address,180),address2:clean(c.address2,100),
    city:clean(c.city,80),postalCode:clean(c.postalCode,30),country:clean(c.country,60)
  };
  if(!calc.items.length)return res.status(400).json({error:'Votre panier est vide.'});
  if(!customer.firstName||!customer.lastName||!/^\S+@\S+\.\S+$/.test(customer.email)||!customer.address||!customer.city||!customer.postalCode)
    return res.status(400).json({error:'Veuillez compléter tous les champs obligatoires.'});

  const orderId='AUR-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomUUID().slice(0,5).toUpperCase();
  const token=crypto.randomBytes(18).toString('hex');
  const order={
    orderId,token,items:calc.items,amount:calc.amount,currency:'EUR',customer,
    paymentStatus:'pending',status:'pending_payment',trackingNumber:'',createdAt:now(),
    history:[{status:'pending_payment',label:'Commande créée',at:now(),source:'storefront'}]
  };
  const orders=readOrders();orders[orderId]=order;writeOrders(orders);
  res.json({orderId,token,amount:order.amount,currency:order.currency});
});

app.post('/api/orders/:id/pay',(req,res)=>{
  const orders=readOrders();
  const o=orders[clean(req.params.id,100)];
  if(!o||clean(req.body?.token,100)!==o.token)return res.status(404).json({error:'Commande introuvable.'});

  if(!DEMO_PAYMENT_MODE){
    return res.status(409).json({error:'Cette démonstration utilise un paiement simulé. Activez un véritable prestataire de paiement avant une mise en production.'});
  }
  if(o.paymentStatus!=='paid'){
    o.paymentStatus='paid';o.status='paid';o.paidAt=now();
    o.history.push({status:'paid',label:'Paiement démo confirmé',at:o.paidAt,source:'demo-payment'});
    orders[o.orderId]=o;writeOrders(orders);
  }
  res.json({ok:true,redirect:`/order.html?id=${encodeURIComponent(o.orderId)}&token=${encodeURIComponent(o.token)}`});
});

app.get('/api/orders/:id',(req,res)=>{
  const o=readOrders()[clean(req.params.id,100)];
  if(!o||clean(req.query.token,100)!==o.token)return res.status(404).json({error:'Commande introuvable.'});
  res.set('Cache-Control','no-store');
  res.json(publicOrder(o));
});

function cookieMap(req){
  return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{
    const i=v.indexOf('=');return [decodeURIComponent(v.slice(0,i)),decodeURIComponent(v.slice(i+1))]
  }));
}
function signSession(exp){
  const body=Buffer.from(JSON.stringify({exp})).toString('base64url');
  const sig=crypto.createHmac('sha256',ADMIN_SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function validSession(token){
  try{
    const [body,sig]=String(token||'').split('.');
    if(!body||!sig)return false;
    const expected=crypto.createHmac('sha256',ADMIN_SESSION_SECRET).update(body).digest('base64url');
    const a=Buffer.from(sig),b=Buffer.from(expected);
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;
    return Number(JSON.parse(Buffer.from(body,'base64url').toString()).exp)>Date.now();
  }catch{return false}
}
function adminOnly(req,res,next){
  if(!validSession(cookieMap(req)[COOKIE]))return res.status(401).json({error:'Non autorisé'});
  next();
}
app.post('/api/admin/login',(req,res)=>{
  const provided=Buffer.from(String(req.body?.password||'')),expected=Buffer.from(ADMIN_PASSWORD);
  if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected))
    return res.status(401).json({error:'Mot de passe incorrect.'});
  const secure=BASE_URL.startsWith('https://')?'; Secure':'';
  res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(signSession(Date.now()+SESSION_HOURS*3600000))}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS*3600}${secure}`);
  res.json({ok:true});
});
app.post('/api/admin/logout',(_req,res)=>{
  res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
  res.json({ok:true});
});
app.get('/api/admin/me',adminOnly,(_req,res)=>res.json({ok:true}));

app.get('/api/admin/orders',adminOnly,(req,res)=>{
  const q=clean(req.query.q,120).toLowerCase();
  let list=Object.values(readOrders()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(q)list=list.filter(o=>[
    o.orderId,o.customer.firstName,o.customer.lastName,o.customer.email,o.trackingNumber,...o.items.map(i=>i.name)
  ].some(v=>String(v||'').toLowerCase().includes(q)));
  res.json(list.map(({token,...o})=>o));
});

app.patch('/api/admin/orders/:id',adminOnly,(req,res)=>{
  const orders=readOrders(),o=orders[clean(req.params.id,100)];
  if(!o)return res.status(404).json({error:'Commande introuvable.'});
  if(o.paymentStatus!=='paid')return res.status(409).json({error:'Le paiement doit être confirmé avant le traitement de la commande.'});
  const next=clean(req.body?.status,30);
  const transitions={paid:['prepared','shipped','completed'],prepared:['shipped','completed'],shipped:['completed'],completed:[]};
  if(!transitions[o.status]?.includes(next))return res.status(400).json({error:'Transition de statut invalide.'});
  o.status=next;
  if(req.body?.trackingNumber)o.trackingNumber=clean(req.body.trackingNumber,100);
  const labels={prepared:'Commande préparée',shipped:'Commande expédiée',completed:'Commande terminée'};
  o.history.push({status:next,label:labels[next]||next,at:now(),source:'admin'});
  orders[o.orderId]=o;writeOrders(orders);
  res.json({ok:true,order:publicOrder(o)});
});

app.post('/api/demo/reset',adminOnly,(_req,res)=>{
  writeOrders({});
  res.json({ok:true});
});

app.listen(PORT,()=>console.log(`AURORA showcase running at ${BASE_URL} · ${DEMO_PAYMENT_MODE?'DEMO PAYMENT':'EXTERNAL PAYMENT'} mode`));
