const ALLOWED = new Set(["/business/channels","/business/sends/","/business/receives/"]);

function hmacBase64(secret, message) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"])
    .then(key => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)))
    .then(buf => btoa(String.fromCharCode(...new Uint8Array(buf))));
}

// Current Yellow Card authentication: timestamp + path (without query) + uppercase method.
// GET has no body hash. No non-GET signing or calls are implemented.
export async function makeSignature(secret, timestamp, path, method="GET") {
  if (method !== "GET") throw new Error("READ_ONLY_BLOCK");
  return hmacBase64(secret, timestamp + path + method);
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status,headers:{"Cache-Control":"no-store","Content-Type":"application/json"}});
}
function safeEqual(a,b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff=0;
  for (let i=0;i<a.length;i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff===0;
}
function isDashboardAuthorized(request,env) {
  const token=env.DASHBOARD_TOKEN;
  if (!token) return false;
  return safeEqual(request.headers.get("Authorization") || "", "Bearer " + token);
}

async function yellowCardGet(env, pathname, queryString="") {
  if (!ALLOWED.has(pathname)) throw new Error("ENDPOINT_BLOCK");
  if (!env.YC_API_KEY || !env.YC_API_SECRET) throw new Error("CREDENTIALS_NOT_CONFIGURED");
  const base=(env.YC_BASE_URL || "https://sandbox.api.yellowcard.io").replace(/\/$/,"");
  const url=new URL(base+pathname+queryString);
  const timestamp=new Date().toISOString();
  const signature=await makeSignature(env.YC_API_SECRET,timestamp,pathname,"GET");
  const response=await fetch(url.toString(),{
    method:"GET",
    headers:{
      "accept":"application/json",
      "X-YC-Timestamp":timestamp,
      "Authorization":`YcHmacV1 ${env.YC_API_KEY}:${signature}`
    },
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error("YELLOW_CARD_HTTP_"+response.status);
  return response.json();
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (request.method!=="GET") return json({error:"READ_ONLY: only GET is permitted"},405);
    if (url.pathname==="/api/status") return json({
      mode:env.APP_MODE || "demo",
      connectorConfigured:Boolean(env.YC_API_KEY && env.YC_API_SECRET),
      dashboardProtectionConfigured:Boolean(env.DASHBOARD_TOKEN),
      liveTrading:false,orderPlacement:false,transfers:false,settlements:false,withdrawals:false,
      marketScope:"BTC",
      accountDataNote:"Yellow Card partner API resources are not proof of a personal retail BTC wallet balance."
    });
    if (url.pathname==="/api/market/btc") {
      try {
        const r=await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",{signal:AbortSignal.timeout(8000)});
        if (!r.ok) throw new Error("market feed unavailable");
        const d=await r.json();
        return json({symbol:"BTCUSDT",price:Number(d.price),source:"Public market data; separate from Yellow Card account data",asOf:new Date().toISOString()});
      } catch { return json({error:"BTC market data unavailable"},502); }
    }
    const routes={
      "/api/yellowcard/channels":"/business/channels",
      "/api/yellowcard/sends":"/business/sends/",
      "/api/yellowcard/receives":"/business/receives/"
    };
    const path=routes[url.pathname];
    if (path) {
      if (!isDashboardAuthorized(request,env)) return json({error:"UNAUTHORIZED"},401);
      if ((env.APP_MODE || "demo")==="demo") return json({connected:false,mode:"demo",message:"No API request made. Configure sandbox credentials after partner approval."});
      if (env.APP_MODE!=="sandbox") return json({error:"MODE_BLOCKED: only demo or approved sandbox mode is permitted; production is locked"},423);
      try {
        const data=await yellowCardGet(env,path,url.search);
        return json({connected:true,retrievedAt:new Date().toISOString(),data});
      } catch(e) {
        const safe=["CREDENTIALS_NOT_CONFIGURED","ENDPOINT_BLOCK"].includes(e.message)?e.message:"Yellow Card read request failed; check approved partner credentials and read permission.";
        return json({connected:false,error:safe},503);
      }
    }
    return json({error:"Not found"},404);
  }
};
export {ALLOWED,yellowCardGet,isDashboardAuthorized};
