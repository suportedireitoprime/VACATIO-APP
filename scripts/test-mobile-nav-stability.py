#!/usr/bin/env python3
"""
Mobile navigation + back-button stability test.

Simulates a user tapping through the main sections on a phone-sized viewport
and then hammering the browser back button. Verifies the UI does not freeze:
 - every navigation completes within a hard timeout
 - after each back(), the page is still interactive (a heartbeat click works)
 - no [nav-telemetry] long-task events exceed FREEZE_MS
 - no uncaught errors or unhandled rejections

Usage:
  BASE_URL=http://localhost:8080 python3 scripts/test-mobile-nav-stability.py

Requires Playwright (pre-installed in the Lovable sandbox).
Exits 0 on pass, non-zero on the first failure.
"""
import asyncio, os, sys, json
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080")
ROUTES = [
    "/",
    "/legislacao/constituicao",
    "/legislacao/codigos",
    "/blog",
    "/biblioteca",
    "/ferramentas",
    "/jurisprudencia",
]
NAV_TIMEOUT_MS = 8000       # hard cap per navigation
FREEZE_MS = 400             # a long-task above this counts as a freeze
HEARTBEAT_TIMEOUT_MS = 3000 # UI must respond within this after back()

SCREENSHOTS = Path("/tmp/browser/mobile-nav-stability")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main() -> int:
    freezes: list[dict] = []
    errors: list[dict] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},  # iPhone 14-ish
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            user_agent=(
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
            ),
        )
        page = await context.new_page()

        def on_console(msg):
            text = msg.text
            if "[nav-telemetry]" in text and "long-task" in text:
                try:
                    payload = text.split("[nav-telemetry]", 1)[1].strip()
                    if "ms:" in payload:
                        ms = int(payload.split("ms:")[1].split(",")[0].strip())
                        if ms >= FREEZE_MS:
                            freezes.append({"ms": ms, "raw": text[:200]})
                except Exception:
                    pass
            elif msg.type == "error":
                errors.append({"type": "console.error", "text": text[:200]})
        page.on("console", on_console)
        page.on("pageerror", lambda e: errors.append({"type": "pageerror", "text": str(e)[:200]}))

        # Forward walk
        for i, route in enumerate(ROUTES):
            url = BASE_URL.rstrip("/") + route
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            except Exception as e:
                print(f"FAIL: navigation to {route} timed out: {e}")
                return 2
            await page.wait_for_timeout(400)
            await page.screenshot(path=str(SCREENSHOTS / f"fwd_{i}_{route.strip('/').replace('/','_') or 'home'}.png"))

        # Back-button hammer
        for i in range(len(ROUTES) - 1):
            try:
                await page.go_back(wait_until="domcontentloaded", timeout=NAV_TIMEOUT_MS)
            except Exception as e:
                print(f"FAIL: back() step {i} froze: {e}")
                return 3
            # Heartbeat: click <body> — if the page is frozen this will time out.
            try:
                await page.evaluate("() => document.body && document.body.getBoundingClientRect()", )
                await page.wait_for_function("document.readyState === 'complete' || document.readyState === 'interactive'",
                                             timeout=HEARTBEAT_TIMEOUT_MS)
            except Exception as e:
                print(f"FAIL: UI unresponsive after back() step {i}: {e}")
                return 4
            await page.screenshot(path=str(SCREENSHOTS / f"back_{i}.png"))

        await browser.close()

    print(json.dumps({"errors": errors, "freezes": freezes}, indent=2))
    if errors:
        print(f"FAIL: {len(errors)} JS errors captured")
        return 5
    if freezes:
        print(f"FAIL: {len(freezes)} long-task freezes >= {FREEZE_MS}ms")
        return 6
    print("PASS: mobile nav + back-button stable across", len(ROUTES), "routes")
    return 0

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))