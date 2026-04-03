from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class PinVerify(BaseModel):
    pin: str

class PinChange(BaseModel):
    current_pin: str
    new_pin: str


# ── Account ──────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    owner: str
    broker: str
    account_type: str  # "stocks" or "mf"

class AccountOut(BaseModel):
    id: int
    owner: str
    broker: str
    account_type: str
    display_name: str
    display_order: int

    class Config:
        from_attributes = True


# ── Holding ──────────────────────────────────────────────────────────────────

class StockHoldingCreate(BaseModel):
    symbol: str
    qty: float
    avg_price: float

class MFHoldingCreate(BaseModel):
    name: str
    scheme_code: str
    units: float
    avg_nav: float

class HoldingUpdate(BaseModel):
    symbol: Optional[str] = None
    qty: Optional[float] = None
    avg_price: Optional[float] = None
    name: Optional[str] = None
    scheme_code: Optional[str] = None
    units: Optional[float] = None
    avg_nav: Optional[float] = None

class HoldingOut(BaseModel):
    id: int
    account_id: int
    symbol: Optional[str] = None
    qty: Optional[float] = None
    avg_price: Optional[float] = None
    name: Optional[str] = None
    scheme_code: Optional[str] = None
    units: Optional[float] = None
    avg_nav: Optional[float] = None

    class Config:
        from_attributes = True


# ── Snapshot ─────────────────────────────────────────────────────────────────

class SnapshotOut(BaseModel):
    id: int
    timestamp: datetime
    total_invested: float
    total_current: float
    total_pnl: float
    total_pnl_pct: float

    class Config:
        from_attributes = True

class SnapshotDetailOut(BaseModel):
    id: int
    account_name: str
    account_type: str
    invested: float
    current: float
    pnl: float
    pnl_pct: float

    class Config:
        from_attributes = True
