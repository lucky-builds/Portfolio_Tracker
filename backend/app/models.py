from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String, nullable=False)          # "Lucky" or "Garima"
    broker = Column(String, nullable=False)          # "Groww" or "Kite"
    account_type = Column(String, nullable=False)    # "stocks" or "mf"
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    holdings = relationship("Holding", back_populates="account", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("owner", "broker", "account_type", name="uq_account"),
    )

    @property
    def display_name(self):
        type_label = "Stocks" if self.account_type == "stocks" else "MF"
        return f"{self.owner} - {self.broker} ({type_label})"


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)

    # For stocks
    symbol = Column(String, nullable=True)       # e.g. "TATASTEEL.NS"
    qty = Column(Float, nullable=True)
    avg_price = Column(Float, nullable=True)

    # For mutual funds
    name = Column(String, nullable=True)
    scheme_code = Column(String, nullable=True)
    units = Column(Float, nullable=True)
    avg_nav = Column(Float, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    account = relationship("Account", back_populates="holdings")


class Snapshot(Base):
    """Daily portfolio snapshot — one row per cron run."""
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    total_invested = Column(Float, nullable=False)
    total_current = Column(Float, nullable=False)
    total_pnl = Column(Float, nullable=False)
    total_pnl_pct = Column(Float, nullable=False)

    details = relationship("SnapshotDetail", back_populates="snapshot", cascade="all, delete-orphan")


class SnapshotDetail(Base):
    """Per-account breakdown within a snapshot."""
    __tablename__ = "snapshot_details"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    account_name = Column(String, nullable=False)  # denormalized for history
    account_type = Column(String, nullable=False)

    invested = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    pnl = Column(Float, nullable=False)
    pnl_pct = Column(Float, nullable=False)

    snapshot = relationship("Snapshot", back_populates="details")

    holdings_data = relationship("SnapshotHolding", back_populates="detail", cascade="all, delete-orphan")


class SnapshotHolding(Base):
    """Per-holding data at snapshot time."""
    __tablename__ = "snapshot_holdings"

    id = Column(Integer, primary_key=True, index=True)
    detail_id = Column(Integer, ForeignKey("snapshot_details.id", ondelete="CASCADE"), nullable=False)

    symbol_or_name = Column(String, nullable=False)
    qty_or_units = Column(Float, nullable=False)
    avg_price_or_nav = Column(Float, nullable=False)
    current_price_or_nav = Column(Float, nullable=True)  # null if fetch failed
    invested = Column(Float, nullable=False)
    current = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    pnl_pct = Column(Float, nullable=True)

    detail = relationship("SnapshotDetail", back_populates="holdings_data")
