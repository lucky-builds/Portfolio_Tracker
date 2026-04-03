from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.auth import verify_pin
from app.config import PIN
from app.models import Account, Holding, Snapshot, SnapshotDetail
from app.schemas import (
    PinVerify, PinChange,
    AccountCreate, AccountOut,
    StockHoldingCreate, MFHoldingCreate, HoldingUpdate, HoldingOut,
    SnapshotOut, SnapshotDetailOut,
)
from app.services import fetch_all_portfolios, take_snapshot

router = APIRouter(prefix="/api")


# ── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/auth/verify")
def verify(body: PinVerify):
    if body.pin != PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return {"ok": True}


@router.post("/auth/change-pin", dependencies=[Depends(verify_pin)])
def change_pin(body: PinChange):
    import app.config as cfg
    if body.current_pin != cfg.PIN:
        raise HTTPException(status_code=401, detail="Current PIN is incorrect")
    cfg.PIN = body.new_pin
    return {"ok": True, "message": "PIN changed (note: resets on restart unless you update AUTH_PIN env var)"}


# ── Portfolio (live fetch) ───────────────────────────────────────────────────

@router.get("/portfolio", dependencies=[Depends(verify_pin)])
def get_portfolio(db: Session = Depends(get_db)):
    return fetch_all_portfolios(db)


@router.post("/portfolio/snapshot", dependencies=[Depends(verify_pin)])
def trigger_snapshot(db: Session = Depends(get_db)):
    """Ad-hoc snapshot — same as cron but triggered manually."""
    snapshot = take_snapshot(db)
    return {"ok": True, "snapshot_id": snapshot.id}


# ── Cron endpoint (called by Railway cron) ───────────────────────────────────

@router.post("/cron/snapshot")
def cron_snapshot(db: Session = Depends(get_db)):
    """Called by Railway's native cron job. No PIN required (internal)."""
    snapshot = take_snapshot(db)
    return {"ok": True, "snapshot_id": snapshot.id}


# ── Accounts CRUD ────────────────────────────────────────────────────────────

@router.get("/accounts", dependencies=[Depends(verify_pin)], response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).order_by(Account.display_order, Account.id).all()


@router.post("/accounts", dependencies=[Depends(verify_pin)], response_model=AccountOut)
def create_account(body: AccountCreate, db: Session = Depends(get_db)):
    if body.account_type not in ("stocks", "mf"):
        raise HTTPException(400, "account_type must be 'stocks' or 'mf'")
    existing = db.query(Account).filter_by(
        owner=body.owner, broker=body.broker, account_type=body.account_type
    ).first()
    if existing:
        raise HTTPException(409, "Account already exists")
    acc = Account(owner=body.owner, broker=body.broker, account_type=body.account_type)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/accounts/{account_id}", dependencies=[Depends(verify_pin)])
def delete_account(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).get(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    db.delete(acc)
    db.commit()
    return {"ok": True}


# ── Holdings CRUD ────────────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/holdings", dependencies=[Depends(verify_pin)], response_model=list[HoldingOut])
def list_holdings(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).get(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    return acc.holdings


@router.post("/accounts/{account_id}/holdings/stock", dependencies=[Depends(verify_pin)], response_model=HoldingOut)
def add_stock_holding(account_id: int, body: StockHoldingCreate, db: Session = Depends(get_db)):
    acc = db.query(Account).get(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if acc.account_type != "stocks":
        raise HTTPException(400, "This account is not a stocks account")
    # Ensure .NS suffix
    symbol = body.symbol if body.symbol.endswith(".NS") else body.symbol + ".NS"
    h = Holding(account_id=account_id, symbol=symbol, qty=body.qty, avg_price=body.avg_price)
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.post("/accounts/{account_id}/holdings/mf", dependencies=[Depends(verify_pin)], response_model=HoldingOut)
def add_mf_holding(account_id: int, body: MFHoldingCreate, db: Session = Depends(get_db)):
    acc = db.query(Account).get(account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    if acc.account_type != "mf":
        raise HTTPException(400, "This account is not a mutual fund account")
    h = Holding(account_id=account_id, name=body.name, scheme_code=body.scheme_code,
                units=body.units, avg_nav=body.avg_nav)
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.put("/holdings/{holding_id}", dependencies=[Depends(verify_pin)], response_model=HoldingOut)
def update_holding(holding_id: int, body: HoldingUpdate, db: Session = Depends(get_db)):
    h = db.query(Holding).get(holding_id)
    if not h:
        raise HTTPException(404, "Holding not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(h, key, val)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/holdings/{holding_id}", dependencies=[Depends(verify_pin)])
def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    h = db.query(Holding).get(holding_id)
    if not h:
        raise HTTPException(404, "Holding not found")
    db.delete(h)
    db.commit()
    return {"ok": True}


# ── Snapshots (history) ─────────────────────────────────────────────────────

@router.get("/snapshots", dependencies=[Depends(verify_pin)], response_model=list[SnapshotOut])
def list_snapshots(limit: int = 60, offset: int = 0, db: Session = Depends(get_db)):
    return (
        db.query(Snapshot)
        .order_by(Snapshot.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/snapshots/{snapshot_id}", dependencies=[Depends(verify_pin)])
def get_snapshot(snapshot_id: int, db: Session = Depends(get_db)):
    snap = db.query(Snapshot).get(snapshot_id)
    if not snap:
        raise HTTPException(404, "Snapshot not found")
    details = db.query(SnapshotDetail).filter_by(snapshot_id=snapshot_id).all()
    return {
        "id": snap.id,
        "timestamp": snap.timestamp.isoformat(),
        "total_invested": snap.total_invested,
        "total_current": snap.total_current,
        "total_pnl": snap.total_pnl,
        "total_pnl_pct": snap.total_pnl_pct,
        "details": [
            {
                "account_name": d.account_name,
                "account_type": d.account_type,
                "invested": d.invested,
                "current": d.current,
                "pnl": d.pnl,
                "pnl_pct": d.pnl_pct,
            }
            for d in details
        ],
    }


# ── Seed from holdings.json ─────────────────────────────────────────────────

@router.post("/seed", dependencies=[Depends(verify_pin)])
def seed_from_json(db: Session = Depends(get_db)):
    """One-time import from the original holdings.json format."""
    import json, os
    json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "holdings.json")
    if not os.path.exists(json_path):
        raise HTTPException(404, "holdings.json not found")

    with open(json_path) as f:
        data = json.load(f)

    created = 0
    for account_name, account_data in data.items():
        # Parse "Owner - Broker (Type)" format
        parts = account_name.split(" - ")
        owner = parts[0].strip()
        rest = parts[1].strip() if len(parts) > 1 else ""

        if "(Stocks)" in rest:
            broker = rest.replace("(Stocks)", "").strip()
            acc_type = "stocks"
        elif "(MF)" in rest:
            broker = rest.replace("(MF)", "").strip()
            acc_type = "mf"
        else:
            broker = rest
            acc_type = account_data.get("type", "stocks")

        # Find or create account
        acc = db.query(Account).filter_by(owner=owner, broker=broker, account_type=acc_type).first()
        if not acc:
            acc = Account(owner=owner, broker=broker, account_type=acc_type, display_order=created)
            db.add(acc)
            db.flush()

        for h in account_data.get("holdings", []):
            if acc_type == "stocks":
                holding = Holding(
                    account_id=acc.id,
                    symbol=h["symbol"],
                    qty=h["qty"],
                    avg_price=h["avg_price"],
                )
            else:
                holding = Holding(
                    account_id=acc.id,
                    name=h["name"],
                    scheme_code=h["scheme_code"],
                    units=h["units"],
                    avg_nav=h["avg_nav"],
                )
            db.add(holding)
            created += 1

    db.commit()
    return {"ok": True, "holdings_imported": created}
