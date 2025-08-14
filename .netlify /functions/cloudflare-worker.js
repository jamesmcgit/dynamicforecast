export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/,''); // strip trailing slash

    // CORS
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    try {
      if (path === "/eia") {
        const ba = url.searchParams.get("ba");
        const length = url.searchParams.get("length") || "1200";
        const key = url.searchParams.get("key");
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
        const r = await fetch(upstream, { cf: { cacheTtl: 120 } });
        const j = await r.json();
        const rows = (j?.response?.data || []).map(o => ({ t: o.period, mw: Number(o.value) })).reverse();
        return new Response(JSON.stringify({ data: rows }), { headers: { "content-type": "application/json", ...cors } });
      }

      if (path === "/wx") {
        const upstream = "https://api.open-meteo.com/v1/forecast?" + url.searchParams.toString();
        const r = await fetch(upstream, { cf: { cacheTtl: 600 } });
        const j = await r.json();
        return new Response(JSON.stringify(j), { headers: { "content-type": "application/json", ...cors } });
      }

      if (path === "/demand") {
        // Normalize Canada operator feeds to [{t, mw}] in local time where possible.
        const iso = (url.searchParams.get("iso") || "").toUpperCase();

        // IESO (Ontario): JSON endpoint providing hourly Ontario demand.
        if (iso === "IESO") {
          // Example endpoint (subject to change): this Worker should be updated if IESO changes format.
          const upstream = "https://www.ieso.ca/api/Data/HourlyOntarioDemand"; // returns list of {Date, Demand}
          const r = await fetch(upstream, { cf: { cacheTtl: 900 } });
          const j = await r.json();
          const rows = (j || []).map(o => ({ t: o.Date, mw: Number(o.Demand) }));
          return new Response(JSON.stringify({ data: rows }), { headers: { "content-type": "application/json", ...cors } });
        }

        // AESO (Alberta): CSV -> JSON normalize
        if (iso === "AESO") {
          const upstream = "https://api.aeso.ca/report/ActualDemand.csv"; // placeholder; replace with correct URL if needed
          const r = await fetch(upstream, { cf: { cacheTtl: 900 } });
          const text = await r.text();
          const lines = text.trim().split(/\r?\n/);
          const rows = [];
          const headers = lines.shift().split(",");
          const ti = headers.findIndex(h => /time/i.test(h));
          const di = headers.findIndex(h => /demand/i.test(h));
          for (const line of lines) {
            const parts = line.split(",");
            const t = parts[ti];
            const mw = Number(parts[di]);
            if (!isNaN(mw)) rows.push({ t, mw });
          }
          return new Response(JSON.stringify({ data: rows }), { headers: { "content-type": "application/json", ...cors } });
        }

        // BCH, HQ: placeholders expecting JSON/CSV to be normalized similarly.\n        if (iso === "BCH" || iso === "HQ") {\n          return new Response(JSON.stringify({ data: [] }), { headers: { \"content-type\": \"application/json\", ...cors } });\n        }\n\n        return new Response(JSON.stringify({ error: \"Unknown ISO\" }), { status: 400, headers: cors });\n      }\n\n      return new Response(JSON.stringify({ ok: true, routes: [\"/eia\",\"/wx\",\"/demand?iso=IESO|AESO|BCH|HQ\"] }), { headers: { \"content-type\": \"application/json\", ...cors } });\n    } catch (e) {\n      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });\n    }\n  }\n};\n