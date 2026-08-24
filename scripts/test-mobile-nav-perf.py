#!/usr/bin/env python3
"""
Mobile performance regression test — measures INP (Interaction to Next Paint)
and route-to-route navigation times on a phone-sized viewport, and fails when
they exceed budgets that the app has been shown to meet.

What it measures per route
 - `nav_ms`: wall-clock from goto() start until `load` event
 - `fcp_ms`: First Contentful Paint (via PerformanceObserver)
 - `lcp_ms`: Largest Contentful Paint (best-effort — some routes have none)
 - `inp_ms`: worst Interaction-to-Next-Paint across 3 scripted taps

Budgets (mid-tier Android, throttled 4x CPU):
 - NAV_BUDGET_MS = 3500
 - FCP_BUDGET_MS = 2500
 - LCP_BUDGET_MS = 4000
 - INP_BUDGET_MS = 300   (Google "good" threshold is 200; we allow a little
                          headroom because we throttle CPU 4x here.)

Usage:
  BASE_URL=http://localhost:8080 python3 scripts/test-mobile-nav-perf.py
  # write full metrics as JSON for CI history:
  OUT_JSON=/tmp/perf.json BASE_URL=http://localhost:8080 python3 scripts/test-mobile-nav-perf.py

Exits 0 on pass, non-zero on the first budget breach so it wires straight
into CI as a regression gate. Requires Playwright (pre-installed in the
Lovable sandbox).
"""
import asyncio, json, os, sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
OUT_JSON = os.environ.get("OUT_JSON")

ROUTES = [
    "/",
    "/legislacao/constituicao",
    "/legislacao/codigos",
    "/biblioteca",
    "/jurisprudencia",
    "/blog",
    "/ferramentas",
]

NAV_BUDGET_MS = int(os.environ.get("NAV_BUDGET_MS", 3500))
FCP_BUDGET_MS = int(os.environ.get("FCP_BUDGET_MS", 2500))
LCP_BUDGET_MS = int(os.environ.get("LCP_BUDGET_MS", 4000))
INP_BUDGET_MS = int(os.environ.get("INP_BUDGET_MS", 300))

SCREENSHOTS = Path("/tmp/browser/mobile-nav-perf")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

# Script injected on every page — captures FCP/LCP and worst-INP into globals
# the test reads via evaluate(). Uses the same PerformanceObserver API the
# real Web Vitals library uses.
INIT_SCRIPT = r"""
(() => {
  window.__perf = { fcp: null, lcp: null, inp: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.name === 'first-contentful-paint') window.__perf.fcp = e.startTime;
      }
    }).observe({ type: 'paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__perf.lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        // Event Timing exposes an approximate INP via `duration` on
        // long-duration events (>40ms). We track the worst seen.
        if (e.duration && e.duration > window.__perf.inp) {
          window.__perf.inp = e.duration;
        }
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (_) {}
})();
"""

async def measure_route(page, route: str) -> dict:
    url = BASE_URL.rstrip("/") + route
    t0 = asyncio.get_event_loop().time()
    try:
        await page.goto(url, wait_until="load", timeout=NAV_BUDGET_MS + 2000)
    except Exception as e:
        return {"route": route, "error": f"nav-timeout: {e}"}
    nav_ms = int((asyncio.get_event_loop().time() - t0) * 1000)
    # Let observers flush + user-perceived quiet moment.
    await page.wait_for_timeout(600)

    # Drive 3 taps to force real interaction events so INP has something to
    # measure. Target center of viewport (safe for any layout).
    for i in range(3):
        try:
            await page.mouse.click(195, 400 + i * 40, delay=30)
        except Exception:
            pass
        await page.wait_for_timeout(150)

    perf = await page.evaluate("() => window.__perf")
    return {
        "route": route,
        "nav_ms": nav_ms,
        "fcp_ms": int(perf.get("fcp") or 0),
        "lcp_ms": int(perf.get("lcp") or 0),
        "inp_ms": int(perf.get("inp") or 0),
    }

async def main() -> int:
    results: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            ),
        )
        await context.add_init_script(INIT_SCRIPT)
        page = await context.new_page()

        # Throttle CPU 4x to approximate a mid-tier Android device. This is
        # what makes the budgets meaningful — untrottled desktop numbers
        # would never regress.
        client = await context.new_cdp_session(page)
        try:
            await client.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        except Exception:
            pass

        for route in ROUTES:
            r = await measure_route(page, route)
            results.append(r)
            slug = route.strip("/").replace("/", "_") or "home"
            await page.screenshot(path=str(SCREENSHOTS / f"{slug}.png"))

        await browser.close()

    print(json.dumps(results, indent=2))
    if OUT_JSON:
        Path(OUT_JSON).write_text(json.dumps(results, indent=2))

    # Regression gate.
    fails: list[str] = []
    for r in results:
        if r.get("error"):
            fails.append(f"{r['route']}: {r['error']}")
            continue
        if r["nav_ms"] > NAV_BUDGET_MS:
            fails.append(f"{r['route']}: nav {r['nav_ms']}ms > {NAV_BUDGET_MS}ms")
        if r["fcp_ms"] and r["fcp_ms"] > FCP_BUDGET_MS:
            fails.append(f"{r['route']}: FCP {r['fcp_ms']}ms > {FCP_BUDGET_MS}ms")
        if r["lcp_ms"] and r["lcp_ms"] > LCP_BUDGET_MS:
            fails.append(f"{r['route']}: LCP {r['lcp_ms']}ms > {LCP_BUDGET_MS}ms")
        if r["inp_ms"] > INP_BUDGET_MS:
            fails.append(f"{r['route']}: INP {r['inp_ms']}ms > {INP_BUDGET_MS}ms")

    if fails:
        print("FAIL: performance regressions detected:")
        for f in fails:
            print(" - " + f)
        return 1
    print(f"PASS: {len(results)} routes within perf budgets")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))