# Portfolio Tracker

A simple CLI tool to view your entire investment portfolio — across multiple brokers and accounts — in one place, with live prices.

## Why this exists

Managing investments across Zerodha Kite and Groww (stocks + MFs) means logging into 3-4 different apps to get a full picture. No free app does this well for Indian retail investors who use multiple brokers simultaneously. This script solves that with a one-command terminal view.

## Accounts tracked

| Account | Broker | Type |
|---|---|---|
| Lucky - Kite | Zerodha | Stocks |
| Lucky - Groww | Groww | Stocks (Gold ETF) |
| Lucky - Groww | Groww | Mutual Funds |
| Garima - Kite | Zerodha | Stocks |

## How it works

- **Stocks**: Prices fetched live from Yahoo Finance via `yfinance` (NSE symbols ending in `.NS`)
- **Mutual Funds**: NAVs fetched from [mfapi.in](https://mfapi.in) — free, no API key needed
- **Holdings data**: Stored locally in `holdings.json` — you update this manually when you buy or sell
- No login, no broker API, no subscriptions. Fully offline except for the price fetch.

## Setup

```bash
# Install dependencies (one time only)
pip install yfinance requests

# Run
python3 portfolio.py
```

## Output

Colour-coded terminal view showing, per account and per holding:
- Quantity, average buy price, current LTP/NAV
- Invested value, current value
- P&L in ₹ and %

Followed by a grand total across all accounts.

## Updating holdings

Open `holdings.json` and edit the relevant entry whenever you:
- Buy new shares → add a new entry or update qty + avg_price
- Sell shares → reduce qty (or remove entry if fully sold)
- Start a new SIP → add a new MF entry with scheme_code, units, avg_nav

### Stock entry format
```json
{"symbol": "TATASTEEL.NS", "qty": 211, "avg_price": 164.50}
```
Symbol must be the NSE ticker with `.NS` suffix. Look it up on [finance.yahoo.com](https://finance.yahoo.com) if unsure.

### MF entry format
```json
{"name": "Quant Mid Cap Fund Direct Growth", "scheme_code": "120841", "units": 565.211, "avg_nav": 269.09}
```
Find scheme codes at [mfapi.in/mf/search?q=fund+name](https://api.mfapi.in/mf/search?q=quant+mid+cap).
`avg_nav` = total invested ÷ total units (available from your Groww statement).

## Known issues

- `MISHTANN` — delisted from NSE, shows N/A. Remove or track manually.
- `GVTD` — symbol not resolving on Yahoo Finance. Verify the correct NSE ticker.
- Prices are ~15 min delayed (Yahoo Finance free tier). Fine for ad-hoc checks, not for trading.
- MF NAVs update once a day (after market close), so intraday runs will show the same NAV.

## Files

```
portfolio.py     # Main script — run this
holdings.json    # Your holdings data — edit this when you buy/sell
README.md        # This file
```
