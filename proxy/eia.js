// netlify/functions/eia.js
export async function handler(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const { ba, length = 1200, key } = event.queryStringParameters || {};
    const params = new URLSearchParams();
    params.set("api_key", key);
    params.set("frequency", "hourly");
    ["value","period","respondent","type"].forEach(d => params.append("data[]", d));
    params.append("facets[respondent][]", ba);
    params.append("facets[type][]", "D");
    params.append("sort[0][column]", "period");
    params.append("sort[0][direction]", "desc");
    params.set("length", String(Math.min(Number(length)||1200, 2000)));
    const upstream = "https://api.eia.gov/v2/electricity/rto/region-data/data/?" + params.toString();
    const r = await fetch(upstream);
    const j = await r.json();
    const rows = (j?.response?.data || []).map(o => ({ t: o.period, mw: Number(o.value) })).reverse();
    return { statusCode: 200, headers: { "content-type":"application/json", ...headers }, body: JSON.stringify({ data: rows }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
  }
}
