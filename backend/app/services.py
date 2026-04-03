"""Price fetching and snapshot logic — ported from portfolio.py."""

import requests
import yfinance as yf
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models import Account, Holding, Snapshot, SnapshotDetail, SnapshotHolding


# ── Price Fetchers ───────────────────────────────────────────────────────────

def fetch_stock_prices(symbols: list[str]) -> dict[str, float | None]:
    """Bulk fetch current prices for NSE symbols via yfinance."""
    if not symbols:
        return {}
    tickers = yf.Tickers(" ".join(symbols))
    prices = {}
    for sym in symbols:
        try:
            info = tickers.tickers[sym].fast_info
            price = info.last_price
            prices[sym] = round(price, 2) if price else None
        except Exception:
            prices[sym] = None
    return prices


def fetch_mf_nav(scheme_code: str) -> float | None:
    """Fetch latest NAV from mfapi.in."""
    try:
        r = requests.get(f"https://api.mfapi.in/mf/{scheme_code}/latest", timeout=8)
        data = r.json()
        return float(data["data"][0]["nav"])
    except Exception:
        return None


# ── Portfolio Calculation ────────────────────────────────────────────────────

def calculate_account(account: Account, prices: dict) -> dict:
    """Calculate invested/current/pnl for an account given fetched prices."""
    total_invested = 0.0
    total_current = 0.0
    holding_results = []

    for h in account.holdings:
        if account.account_type == "stocks":
            invested = h.qty * h.avg_price
            ltp = prices.get(h.symbol)
            current = (h.qty * ltp) if ltp else None
            label = h.symbol.replace(".NS", "") if h.symbol else "?"
            qty_val = h.qty
            avg_val = h.avg_price
        else:  # mf
            invested = h.units * h.avg_nav
            nav = fetch_mf_nav(h.scheme_code)
            ltp = nav
            current = (h.units * nav) if nav else None
            label = h.name or "?"
            qty_val = h.units
            avg_val = h.avg_nav

        pnl = (current - invested) if current else None
        pnl_pct = ((pnl / invested) * 100) if (pnl is not None and invested) else None

        total_invested += invested
        if current:
            total_current += current

        holding_results.append({
            "id": h.id,
            "symbol_or_name": label,
            "symbol": h.symbol,
            "name": h.name,
            "scheme_code": h.scheme_code,
            "qty_or_units": qty_val,
            "avg_price_or_nav": avg_val,
            "current_price_or_nav": ltp,
            "invested": round(invested, 2),
            "current": round(current, 2) if current else None,
            "pnl": round(pnl, 2) if pnl is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
        })

    total_pnl = total_current - total_invested
    total_pnl_pct = (total_pnl / total_invested * 100) if total_invested else 0

    return {
        "account_id": account.id,
        "account_name": account.display_name,
        "owner": account.owner,
        "broker": account.broker,
        "account_type": account.account_type,
        "invested": round(total_invested, 2),
        "current": round(total_current, 2),
        "pnl": round(total_pnl, 2),
        "pnl_pct": round(total_pnl_pct, 2),
        "holdings": holding_results,
    }


def fetch_all_portfolios(db: Session) -> dict:
    """Fetch live prices and calculate all portfolio values."""
    accounts = db.query(Account).order_by(Account.display_order, Account.id).all()

    # Collect all stock symbols for bulk fetch
    all_symbols = set()
    for acc in accounts:
        if acc.account_type == "stocks":
            for h in acc.holdings:
                if h.symbol:
                    all_symbols.add(h.symbol)

    stock_prices = fetch_stock_prices(list(all_symbols))

    results = []
    grand_invested = 0.0
    grand_current = 0.0

    for acc in accounts:
        acc_data = calculate_account(acc, stock_prices)
        results.append(acc_data)
        grand_invested += acc_data["invested"]
        grand_current += acc_data["current"]

    grand_pnl = grand_current - grand_invested
    grand_pnl_pct = (grand_pnl / grand_invested * 100) if grand_invested else 0

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "accounts": results,
        "total": {
            "invested": round(grand_invested, 2),
            "current": round(grand_current, 2),
            "pnl": round(grand_pnl, 2),
            "pnl_pct": round(grand_pnl_pct, 2),
        },
    }


# ── Snapshot (cron) ──────────────────────────────────────────────────────────

def take_snapshot(db: Session) -> Snapshot:
    """Fetch all prices and save a snapshot to DB."""
    portfolio = fetch_all_portfolios(db)

    snapshot = Snapshot(
        total_invested=portfolio["total"]["invested"],
        total_current=portfolio["total"]["current"],
        total_pnl=portfolio["total"]["pnl"],
        total_pnl_pct=portfolio["total"]["pnl_pct"],
    )
    db.add(snapshot)
    db.flush()

    for acc_data in portfolio["accounts"]:
        detail = SnapshotDetail(
            snapshot_id=snapshot.id,
            account_id=acc_data["account_id"],
            account_name=acc_data["account_name"],
            account_type=acc_data["account_type"],
            invested=acc_data["invested"],
            current=acc_data["current"],
            pnl=acc_data["pnl"],
            pnl_pct=acc_data["pnl_pct"],
        )
        db.add(detail)
        db.flush()

        for h in acc_data["holdings"]:
            sh = SnapshotHolding(
                detail_id=detail.id,
                symbol_or_name=h["symbol_or_name"],
                qty_or_units=h["qty_or_units"],
                avg_price_or_nav=h["avg_price_or_nav"],
                current_price_or_nav=h["current_price_or_nav"],
                invested=h["invested"],
                current=h["current"],
                pnl=h["pnl"],
                pnl_pct=h["pnl_pct"],
            )
            db.add(sh)

    db.commit()
    db.refresh(snapshot)
    return snapshot
