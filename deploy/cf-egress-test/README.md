# Cloudflare egress probe

One-off check: will FPL serve requests from Cloudflare Workers?

```
npx wrangler login        # one-time browser auth (you do this)
cd deploy/cf-egress-test
npx wrangler deploy       # prints a https://fplq-egress-test.<subdomain>.workers.dev URL
curl https://fplq-egress-test.<subdomain>.workers.dev | jq
```

- `"ok": true` and four `200`s -> host the real API on Workers (D1 for rank
  history, a Cron Trigger for the sampler), web on Pages.
- Any `403` / `429` / `ERROR` -> FPL blocks Cloudflare egress; keep the web on
  Pages and put the Node API on an always-on free host instead.

Delete the worker when done: `npx wrangler delete`.
