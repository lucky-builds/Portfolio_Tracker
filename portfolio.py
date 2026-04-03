#!/usr/bin/env python3
"""
Portfolio Tracker — Lucky & Garima
Fetches live prices for stocks (yfinance) and MF NAVs (mfapi.in)
Usage: python3 portfolio.py
"""

import json
import sys
import requests
from datetime import datetime

try:
    import yfinance as yf
except ImportError:
    print("Install yfinance first: pip install yfinance")
    sys.exit(1)


HOLDINGS_FILE = "holdings.json"

# ── colours ─────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

def colour(val, text=None):
    t = text if text is not None else val
    if val > 0:  return f"{GREEN}{t}{RESET}"
    if val < 0:  return f"{RED}{t}{RESET}"
    return str(t)

def pct(val):
    sign = "+" if val >= 0 else ""
    return f"{sign}{val:.2f}%"

def inr(val):
    sign = "-" if val < 0 else ""
    val = abs(val)
    if val >= 1_00_000:
        return f"{sign}₹{val/1_00_000:.2f}L"
    return f"{sign}₹{val:,.0f}"


# ── stock price fetcher ──────────────────────────────────────────────────────
def fetch_stock_prices(symbols):
    """Bulk fetch current prices for a list of NSE symbols."""
    print(f"  {DIM}Fetching {len(symbols)} stock prices...{RESET}", end="", flush=True)
    tickers = yf.Tickers(" ".join(symbols))
    prices = {}
    for sym in symbols:
        try:
            info = tickers.tickers[sym].fast_info
            price = info.last_price
            prices[sym] = round(price, 2) if price else None
        except Exception:
            prices[sym] = None
    print(f" done.")
    return prices


# ── MF NAV fetcher ───────────────────────────────────────────────────────────
def fetch_mf_nav(scheme_code):
    """Fetch latest NAV from mfapi.in (free, no key)."""
    try:
        r = requests.get(f"https://api.mfapi.in/mf/{scheme_code}/latest", timeout=8)
        data = r.json()
        nav = float(data["data"][0]["nav"])
        return nav
    except Exception:
        return None


# ── render one account ───────────────────────────────────────────────────────
def render_account(name, account, prices):
    account_type = account["type"]
    holdings     = account["holdings"]

    total_invested = 0
    total_current  = 0
    rows = []

    if account_type == "stocks":
        for h in holdings:
            sym       = h["symbol"]
            qty       = h["qty"]
            avg       = h["avg_price"]
            invested  = qty * avg
            ltp       = prices.get(sym)

            if ltp is None:
                rows.append((sym.replace(".NS",""), qty, avg, None, invested, None, None, None))
                total_invested += invested
                continue

            current   = qty * ltp
            pnl       = current - invested
            pnl_pct   = (pnl / invested) * 100

            total_invested += invested
            total_current  += current
            rows.append((sym.replace(".NS",""), qty, avg, ltp, invested, current, pnl, pnl_pct))

    elif account_type == "mf":
        for h in holdings:
            units    = h["units"]
            avg_nav  = h["avg_nav"]
            code     = h["scheme_code"]
            label    = h["name"]
            invested = units * avg_nav
            nav      = fetch_mf_nav(code)

            if nav is None:
                rows.append((label[:32], units, avg_nav, None, invested, None, None, None))
                total_invested += invested
                continue

            current  = units * nav
            pnl      = current - invested
            pnl_pct  = (pnl / invested) * 100

            total_invested += invested
            total_current  += current
            rows.append((label[:32], units, avg_nav, nav, invested, current, pnl, pnl_pct))

    # ── header ──
    print(f"\n{BOLD}{'─'*72}{RESET}")
    print(f"{BOLD}  {name}{RESET}")
    print(f"{'─'*72}")

    label_w = 16 if account_type == "stocks" else 34
    print(f"  {'Symbol' if account_type=='stocks' else 'Fund':<{label_w}}  {'Qty':>8}  {'Avg':>9}  {'LTP/NAV':>9}  {'Invested':>12}  {'Current':>12}  {'P&L':>12}  {'%':>7}")
    print(f"  {'-'*label_w}  {'-'*8}  {'-'*9}  {'-'*9}  {'-'*12}  {'-'*12}  {'-'*12}  {'-'*7}")

    for r in rows:
        sym, qty, avg, ltp, inv, cur, pnl, pp = r
        ltp_s = f"{ltp:>9.2f}" if ltp else f"{'N/A':>9}"
        cur_s = f"{inr(cur):>12}" if cur else f"{'N/A':>12}"
        pnl_s = colour(pnl, f"{inr(pnl):>12}") if pnl is not None else f"{'N/A':>12}"
        pp_s  = colour(pp,  f"{pct(pp):>7}")    if pp  is not None else f"{'N/A':>7}"
        print(f"  {sym:<{label_w}}  {qty:>8.3f}  {avg:>9.2f}  {ltp_s}  {inr(inv):>12}  {cur_s}  {pnl_s}  {pp_s}")

    # ── account summary ──
    if total_current > 0:
        acc_pnl     = total_current - total_invested
        acc_pnl_pct = (acc_pnl / total_invested) * 100
        print(f"\n  {'TOTAL':<{label_w}}  {'':>8}  {'':>9}  {'':>9}  {inr(total_invested):>12}  {inr(total_current):>12}  {colour(acc_pnl, inr(acc_pnl)):>12}  {colour(acc_pnl_pct, pct(acc_pnl_pct)):>7}")

    return total_invested, total_current


# ── main ─────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{BOLD}PORTFOLIO TRACKER{RESET}  {DIM}{datetime.now().strftime('%d %b %Y, %I:%M %p')}{RESET}")

    with open(HOLDINGS_FILE) as f:
        data = json.load(f)

    # Collect all stock symbols upfront for a single bulk yfinance call
    all_symbols = []
    for account in data.values():
        if account["type"] == "stocks":
            all_symbols.extend(h["symbol"] for h in account["holdings"])

    print(f"\nFetching prices...")
    prices = fetch_stock_prices(list(set(all_symbols)))

    grand_invested = 0
    grand_current  = 0

    for name, account in data.items():
        inv, cur = render_account(name, account, prices)
        grand_invested += inv
        grand_current  += cur

    # ── grand total ──
    grand_pnl     = grand_current - grand_invested
    grand_pnl_pct = (grand_pnl / grand_invested) * 100 if grand_invested else 0

    print(f"\n{'═'*72}")
    print(f"{BOLD}  GRAND TOTAL{RESET}")
    print(f"{'─'*72}")
    print(f"  Invested :  {BOLD}{inr(grand_invested)}{RESET}")
    print(f"  Current  :  {BOLD}{inr(grand_current)}{RESET}")
    print(f"  P&L      :  {colour(grand_pnl, BOLD + inr(grand_pnl) + RESET)}  ({colour(grand_pnl_pct, pct(grand_pnl_pct))})")
    print(f"{'═'*72}\n")


if __name__ == "__main__":
    main()
