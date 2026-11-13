const ALLOWED = new Set(["/business/channels","/business/sends/","/business/receives/"]);
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paramount Trader v2.0</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#edf2ff;font:15px system-ui,sans-serif}main{max-width:960px;margin:28px auto;padding:18px}.muted{color:#aab6d1}.banner{background:#3b2714;border:1px solid #a86b26;color:#ffe0ae;border-radius:12px;padding:13px;font-weight:750}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:14px 0}.card{background:#151d32;border:1px solid #293653;border-radius:14px;padding:17px;margin:12px 0}.big{font-size:25px;font-weight:750;margin:8px 0}.row{display:flex;gap:8px;flex-wrap:wrap}input{background:#0b1020;color:#fff;border:1px solid #435273;border-radius:8px;padding:11px;min-width:240px;flex:1}button{background:#315eea;color:#fff;border:0;border-radius:8px;padding:11px 15px;font-weight:700}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:380px;overflow:auto;color:#c6d2ee}h1{margin:0 0 4px}h2{font-size:18px;margin-top:0}.tag{display:inline-block;border:1px solid #405175;border-radius:99px;padding:3px 8px;font-size:12px;color:#b9c7e6}
</style></head><body><main><h1>Paramount Trader v2.0</h1><div class="muted">BTC market monitor · Yellow Card partner connector</div>
<p class="banner">READ-ONLY MONITORING. LIVE TRADING, ORDERS, TRANSFERS, SETTLEMENTS AND WITHDRAWALS DISABLED.</p>
<div class="grid"><section class="card"><div class="muted">BTC / USDT</div><div class="big" id="price">Loading…</div><div class="muted" id="priceTime">Public market data, not Yellow Card account data</div></section><section class="card"><div class="muted">Yellow Card connector</div><div class="big" id="state">Not connected</div><div class="muted" id="stateNote">Partner API approval and read-only credentials required</div></section><section class="card"><div class="muted">BTC account holdings</div><div class="big">Not available</div><div class="muted">The documented partner API does not verify a personal BTC wallet balance.</div></section></div>
<section class="card"><h2>Read-only partner access</h2><p class="muted">Enter the dashboard token configured by the account owner in Cloudflare Worker secrets. It is kept in this page's memory only and is not saved to browser storage.</p><div class="row"><input id="token" type="password" autocomplete="off" placeholder="Dashboard access token"><button id="load">Load partner records</button><button id="clear" type="button">Clear token</button></div><p class="muted" id="msg">No Yellow Card API calls are made in demo mode.</p></section>
<section class="card"><h2>Partner payment channels</h2><pre id="channels">Not loaded</pre></section>
<section class="card"><h2>Recent send records</h2><pre id="sends">Not loaded</pre></section>
<section class="card"><h2>Recent receive records</h2><pre id="receives">Not loaded</pre></section>
<p class="muted"><span class="tag">No trading interface</span> <span class="tag">No fund movement</span> <span class="tag">No customer identity fields displayed</span></p>
</main><script>
let accessToken="";
async function loadPrice(){try{const r=await fetch('/api/market/btc');const d=await r.json();document.querySelector('#price').textContent=d.price?'$'+Number(d.price).toLocaleString('en-US',{maximumFractionDigits:2}):'Unavailable';document.querySelector('#priceTime').textContent=d.asOf||d.error||'Public market data';}catch{document.querySelector('#price').textContent='Unavailable';}}
async function loadResource(path,target){const r=await fetch(path,{headers:{Authorization:'Bearer '+accessToken}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');document.querySelector(target).textContent=JSON.stringify(d.data??d,null,2);}
async function loadPartner(){accessToken=document.querySelector('#token').value.trim();if(!accessToken){document.querySelector('#msg').textContent='Enter the dashboard token first.';return;}document.querySelector('#msg').textContent='Checking read-only access…';try{await loadResource('/api/yellowcard/channels','#channels');await loadResource('/api/yellowcard/sends','#sends');await loadResource('/api/yellowcard/receives','#receives');document.querySelector('#state').textContent='Read access confirmed';document.querySelector('#stateNote').textContent='Partner API records loaded; BTC wallet balance is not provided';document.querySelector('#msg').textContent='Read-only partner data retrieved. Sensitive customer identity fields are excluded.';}catch(e){document.querySelector('#state').textContent='Not connected';document.querySelector('#msg').textContent=e.message;}}
document.querySelector('#load').onclick=loadPartner;document.querySelector('#clear').onclick=()=>{accessToken='';document.querySelector('#token').value='';document.querySelector('#channels').textContent='Not loaded';document.querySelector('#sends').textContent='Not loaded';document.querySelector('#receives').textContent='Not loaded';document.querySelector('#state').textContent='Not connected';document.querySelector('#msg').textContent='Token cleared from page memory.';};loadPrice();setInterval(loadPrice,60000);
</script></body></html>`;
function hmacBase64(secret,message) {
  return crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"])
    .then(key=>crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message)))
    .then(buf=>btoa(String.fromCharCode(...new Uint8Array(buf))));
}
export async function makeSignature(secret,timestamp,path,method="GET") {
  if(method!=="GET") throw new Error("READ_ONLY_BLOCK");
  return hmacBase64(secret,timestamp+path+method);
}
function json(data,status=200) {
  return new Response(JSON.stringify(data),{status,headers:{"Cache-Control":"no-store","Content-Type":"application/json"}});
}
function safeEqual(a,b) {
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
export function isDashboardAuthorized(request,env) {
  const token=env.DASHBOARD_TOKEN;
  if(!token) return false;
  return safeEqual(request.headers.get("Authorization")||"","Bearer "+token);
}
function extractRecords(payload) {
  if(Array.isArray(payload)) return payload;
  for(const k of ["data","results","items","records","sends","receives","channels"]) {
    if(Array.isArray(payload?.[k])) return payload[k];
    if(Array.isArray(payload?.data?.[k])) return payload.data[k];
  }
  return [];
}
function minimize(payload,kind) {
  const rows=extractRecords(payload);
  const fields=kind==="channels"?["id","name","type","country","currency","status","widgetStatus"]:["id","status","currency","amount","country","createdAt","updatedAt"];
  return {count:rows.length,items:rows.slice(0,50).map(row=>Object.fromEntries(fields.filter(k=>row?.[k]!==undefined).map(k=>[k,row[k]])))};
}
async function yellowCardGet(env,pathname,queryString="") {
  if(!ALLOWED.has(pathname)) throw new Error("ENDPOINT_BLOCK");
  if(!env.YC_API_KEY||!env.YC_API_SECRET) throw new Error("CREDENTIALS_NOT_CONFIGURED");
  let base=env.YC_BASE_URL||"https://sandbox.api.yellowcard.io"; if(base.endsWith("/")) base=base.slice(0,-1);
  const url=new URL(base+pathname+queryString);
  const timestamp=new Date().toISOString();
  const signature=await makeSignature(env.YC_API_SECRET,timestamp,pathname,"GET");
  const response=await fetch(url.toString(),{method:"GET",headers:{"accept":"application/json","X-YC-Timestamp":timestamp,"Authorization":"YcHmacV1 "+env.YC_API_KEY+":"+signature},signal:AbortSignal.timeout(10000)});
  if(!response.ok) throw new Error("YELLOW_CARD_HTTP_"+response.status);
  return response.json();
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname==="/"&&request.method==="GET") return new Response(PAGE,{headers:{"Content-Type":"text/html;charset=UTF-8","Cache-Control":"no-store"}});
    if(request.method!=="GET") return json({error:"READ_ONLY: only GET is permitted"},405);
    if(url.pathname==="/api/status") return json({mode:env.APP_MODE||"demo",connectorConfigured:Boolean(env.YC_API_KEY&&env.YC_API_SECRET),dashboardProtectionConfigured:Boolean(env.DASHBOARD_TOKEN),liveTrading:false,orderPlacement:false,transfers:false,settlements:false,withdrawals:false,marketScope:"BTC",accountDataNote:"Yellow Card partner API resources are not proof of a personal retail BTC wallet balance."});
    if(url.pathname==="/api/market/btc") {
      try {const r=await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",{signal:AbortSignal.timeout(8000)});if(!r.ok) throw new Error("market feed unavailable");const d=await r.json();return json({symbol:"BTCUSDT",price:Number(d.price),source:"Public market data; separate from Yellow Card account data",asOf:new Date().toISOString()});}
      catch{return json({error:"BTC market data unavailable"},502);}
    }
    const routes={"/api/yellowcard/channels":{path:"/business/channels",kind:"channels"},"/api/yellowcard/sends":{path:"/business/sends/",kind:"transactions"},"/api/yellowcard/receives":{path:"/business/receives/",kind:"transactions"}};
    const route=routes[url.pathname];
    if(route) {
      if(!isDashboardAuthorized(request,env)) return json({error:"UNAUTHORIZED"},401);
      if((env.APP_MODE||"demo")==="demo") return json({connected:false,mode:"demo",message:"No API request made. Configure sandbox credentials after partner approval."});
      if(env.APP_MODE!=="sandbox") return json({error:"MODE_BLOCKED: only demo or approved sandbox mode is permitted; production is locked"},423);
      try {const payload=await yellowCardGet(env,route.path,url.search);return json({connected:true,retrievedAt:new Date().toISOString(),data:minimize(payload,route.kind)});}
      catch(e){const safe=["CREDENTIALS_NOT_CONFIGURED","ENDPOINT_BLOCK"].includes(e.message)?e.message:"Yellow Card read request failed; check approved partner credentials and API read permission.";return json({connected:false,error:safe},503);}
    }
    return json({error:"Not found"},404);
  }
};
export {ALLOWED,yellowCardGet,minimize};
