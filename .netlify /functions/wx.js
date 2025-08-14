// netlify/functions/wx.js
export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const upstream = "https://api.open-meteo.com/v1/forecast?" + (event.rawQuery || "");
    const r = await fetch(upstream);
    const j = await r.json();
    return { statusCode: 200, headers: { "content-type":"application/json", ...headers }, body: JSON.stringify(j) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
  }
}
