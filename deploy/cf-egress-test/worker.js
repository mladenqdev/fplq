// Throwaway probe: does the FPL API answer requests coming from Cloudflare's
// egress IPs? Deploy, hit the *.workers.dev URL, read the JSON. If every status
// is 200 we can host the real API on Workers; if FPL blocks (403/429/timeout)
// we host the API on an always-on box instead and keep only the web on Pages.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36';
const BASE = 'https://fantasy.premierleague.com/api';
const PATHS = ['/bootstrap-static/', '/fixtures/?event=1', '/entry/1965441/', '/event/1/live/'];

export default {
  async fetch() {
    const results = [];
    for (const p of PATHS) {
      const t0 = Date.now();
      try {
        const r = await fetch(BASE + p, { headers: { 'User-Agent': UA } });
        const body = await r.text();
        results.push({ path: p, status: r.status, ms: Date.now() - t0, bytes: body.length });
      } catch (e) {
        results.push({ path: p, status: 'ERROR', ms: Date.now() - t0, error: String(e) });
      }
    }
    const ok = results.every((r) => r.status === 200);
    return new Response(JSON.stringify({ ok, colo: 'see cf-ray header', results }, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  },
};
