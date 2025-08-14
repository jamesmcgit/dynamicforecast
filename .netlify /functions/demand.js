// netlify/functions/demand.js
export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const { iso } = event.queryStringParameters || {};
    if (!iso) return { statusCode: 400, headers, body: JSON.stringify({ error: "iso required" }) };

    // NOTE: These endpoints may change; update as needed.
    if (iso.toUpperCase() === "IESO") {
      const r = await fetch("https://www.ieso.ca/api/Data/HourlyOntarioDemand");
      const j = await r.json();
      const rows = (j || []).map(o => ({ t: o.Date, mw: Number(o.Demand) }));
      return { statusCode: 200, headers: { "content-type":"application/json", ...headers }, body: JSON.stringify({ data: rows }) };
    }

    if (iso.toUpperCase() === "AESO") {
      // Placeholder CSV; replace with correct historical demand CSV if needed
      const r = await fetch("https://api.aeso.ca/report/ActualDemand.csv");
      const text = await r.text();
      const lines = text.trim().split(/\\r?\\n/);
      const headersCsv = lines.shift().split(",");
      const ti = headersCsv.findIndex(h => /time/i.test(h));
      const di = headersCsv.findIndex(h => /demand/i.test(h));
      const rows = [];
      for (const line of lines) {
        const parts = line.split(",");
        const t = parts[ti];
        const mw = Number(parts[di]);
        if (!isNaN(mw)) rows.push({ t, mw });
      }
      return { statusCode: 200, headers: { "content-type":"application/json", ...headers }, body: JSON.stringify({ data: rows }) };
    }

    return { statusCode: 200, headers: { "content-type":"application/json", ...headers }, body: JSON.stringify({ data: [] }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e) }) };
  }
}
