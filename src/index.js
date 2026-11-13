const ALLOWED = new Set(["/business/channels","/business/sends/","/business/receives/"]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function hmacBase64(secret, message) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"])
    .then(key => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)))
    .then(buf => btoa(String.fromCharCode(...new Uint8Array(buf))));
}

// Yellow Card docs: sign timestamp + path (without query string) + uppercase method.
// GET requests do not include a body hash. POST/PUT are not implemented here.
export async function makeSignature(secret, timestamp, path, method="GET") {
  if (method !== "GET") throw new Error("READ_ONLY_BLOCK");
  return hmacBase64(secret, timestamp + path + method);
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {status,headers:{...corsHeaders,"Content-Type":"application/json"}});
}

async function yellowCardGet(env, pathname, queryString="") {
  if (!ALLOWED.has(pathname)) throw new Error("ENDPOINT_BLOCK");
  if (!env.YC_API_KEY || !env.YC_API_SECRET) throw new Error("CREDENTIALS_NOT_CONFIGURED");
  const base = (env.YC_BASE_URL || "https://sandbox.api.yellowcard.io").replace(/\/$/,"");
  const url = new URL(base + pathname + queryString);
  const timestamp = new Date().toISOString();
  const signature = await makeSignature(env.YC_API_SECRET, timestamp, pathname, "GET");
  const response = await fetch(url.toString(), {
    method:"GET",
    headers:{
      "accept":"application/json",
      "X-YC-Timestamp":timestamp,
      "Authorization":`YcHmacV1 ${env.YC_API_KEY}:${signature}`
    },
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error("YELLOW_CARD_HTTP_" + response.status);
  return response.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders});
    if (request.method !== "GET") return json({error:"READ_ONLY: only GET is permitted"},405);

    if (url.pathname === "/api/status") {
      return json({
        mode: env.APP_MODE || "demo",
        connectorConfigured: Boolean(env.YC_API_KEY && env.YC_API_SECRET),
        liveTrading:false, orderPlacement:false, transfers:false, settlements:false, withdrawals:false,
        marketScope:"BTC",
        accountDataNote:"Yellow Card partner API resources are not proof of a personal retail BTC wallet balance."
      });
    }

    if (url.pathname === "/api/market/btc") {
      try {
        const r = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",{signal:AbortSignal.timeout(8000)});
        if (!r.ok) throw new Error("market feed unavailable");
        const d = await r.json();
        return json({symbol:"BTCUSDT",price:Number(d.price),source:"Public market data; separate from Yellow Card account data",asOf:new Date().toISOString()});
      } catch { return json({error:"BTC market data unavailable"},502); }
    }

    const routes = {
      "/api/yellowcard/channels":"/business/channels",
      "/api/yellowcard/sends":"/business/sends/",
      "/api/yellowcard/receives":"/business/receives/"
    };
    const path = routes[url.pathname];
    if (path) {
      if ((env.APP_MODE || "demo") === "demo") return json({connected:false,mode:"demo",message:"No API request made. Sandbox credentials required."});
      if (env.APP_MODE === "production") return json({error:"PRODUCTION_LOCKED: production enablement requires partner approval and security review"},423);
      try {
        const data = await yellowCardGet(env,path,url.search);
        return json({connected:true,retrievedAt:new Date().toISOString(),data});
      } catch(e) {
        const safe = ["CREDENTIALS_NOT_CONFIGURED","ENDPOINT_BLOCK"].includes(e.message) ? e.message : "Yellow Card read request failed; check partner credentials and permissions.";
        return json({connected:false,error:safe},503);
      }
    }

    return json({error:"Not found"},404);
  }
};

export { ALLOWED, yellowCardGet };
