# [DNS Bench Pro](https://dnsbenchpro.netlify.app)

**DNS Bench Pro** is a client-side DNS-over-HTTPS (DoH) benchmark. It helps you find the closest, fastest public resolver from your current network — privately, in the browser.

## Features

* **Client-side only** — queries run from your browser; this site does not log your IP or results.
* **Test profiles** — Quick, Balanced, Thorough, or Comprehensive query depths with time estimates.
* **Live progress** — warm-up vs measuring phases, determinate progress, and Stop.
* **Configurable** — edit providers and sites, apply presets, or reset to defaults before you run.
* **Clear results** — recommendation hero, live latency bars, cached vs uncached breakdown, sortable comparison with stable median ranks, CSV export, and share/copy summary.

## How to use

1. Open [DNS Bench Pro](https://dnsbenchpro.netlify.app).
2. Optionally click **Configure** to change providers, sites, or presets.
3. Click **Start test** and choose a profile.
4. Watch live results; use **Stop test** if you need to cancel.
5. Review the recommendation, then export or share if you want.

## How it works

The app measures DoH latency against a list of public resolvers and popular domains. A warm-up pass primes connections so cold TCP/TLS handshakes do not dominate the first timed queries. The first query per domain uses a random subdomain (uncached path); later queries measure warmer/cached responses.

## Local development

Serve the repo root over HTTP (ES modules require a server):

```bash
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed local URL.

## Inspired by

[DoHSpeedTest / dnsspeedtest](https://github.com/BrainicHQ/DoHSpeedTest) by **BrainicHQ**
