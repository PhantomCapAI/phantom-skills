import crypto from "crypto";
import https from "https";

const API_KEY = "1k4MGAiC8m38PQwvNhdLNKDEC";
const API_SECRET = "s3159w4e6BcJBHp9ObkewrECU9OT4jkHUOZQIAcEkm0rpzRJAP";
const ACCESS_TOKEN = "2029030023110508548-kRanbEAghoylVagIrHqRbP0xDlrzYD";
const ACCESS_SECRET = "D74gYrghITrg7y6twz717M8x3MSwZ8Ec1P8YmneYLX3UL";

function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function sign(method, url, params) {
  const ordered = Object.keys(params).sort().map((k) => percentEncode(k) + "=" + percentEncode(params[k])).join("&");
  const base = method + "&" + percentEncode(url) + "&" + percentEncode(ordered);
  const key = percentEncode(API_SECRET) + "&" + percentEncode(ACCESS_SECRET);
  return crypto.createHmac("sha1", key).update(base).digest("base64");
}

const tweet = `AI agents get blocked by CAPTCHAs, rejected by APIs, treated as bots.

Phantom Agent Passport fixes that.

Verified cryptographic identity + reputation scoring. Bronze to Black tier. Gold+ agents bypass CAPTCHAs.

Services verify agents with one API call.

https://github.com/PhantomCapAI/phantom-skills`;

function attempt(n) {
  const url = "https://api.twitter.com/2/tweets";
  const oauthParams = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  oauthParams.oauth_signature = sign("POST", url, oauthParams);
  const authHeader = "OAuth " + Object.keys(oauthParams).sort().map((k) => percentEncode(k) + '="' + percentEncode(oauthParams[k]) + '"').join(", ");
  const body = JSON.stringify({ text: tweet });

  const req = https.request(url, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  }, (res) => {
    let d = "";
    res.on("data", (c) => (d += c));
    res.on("end", () => {
      if (res.statusCode === 201) {
        const j = JSON.parse(d);
        console.log("POSTED: https://twitter.com/phantomcap_ai/status/" + j.data.id);
        process.exit(0);
      } else {
        console.log(`Attempt ${n} — ${res.statusCode}, retrying in 3 min...`);
        if (n < 8) setTimeout(() => attempt(n + 1), 180000);
        else { console.log("Gave up"); process.exit(1); }
      }
    });
  });
  req.write(body);
  req.end();
}

attempt(1);
