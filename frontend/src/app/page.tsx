"use client";

import { useEffect, useState, useCallback } from "react";
import { getPortfolio, triggerSnapshot } from "@/lib/api";
import { formatINR, formatPct, pnlColor, formatDate } from "@/lib/utils";

type HoldingData = {
  id: number;
  symbol_or_name: string;
  qty_or_units: number;
  avg_price_or_nav: number;
  current_price_or_nav: number | null;
  invested: number;
  current: number | null;
  pnl: number | null;
  pnl_pct: number | null;
};

type AccountData = {
  account_id: number;
  account_name: string;
  owner: string;
  broker: string;
  account_type: string;
  invested: number;
  current: number;
  pnl: number;
  pnl_pct: number;
  holdings: HoldingData[];
};

type PortfolioData = {
  timestamp: string;
  accounts: AccountData[];
  total: { invested: number; current: number; pnl: number; pnl_pct: number };
};

type ViewMode = "all" | "stocks" | "mf" | string;

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("all");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await getPortfolio();
      setData(res);
    } catch {
      // handled by api layer (redirect to login)
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerSnapshot();
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAccount = (id: number) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted text-sm">Loading portfolio...</div>
      </div>
    );
  }

  if (!data) return null;

  // Filter accounts based on view
  const filteredAccounts = data.accounts.filter((acc) => {
    if (view === "all") return true;
    if (view === "stocks") return acc.account_type === "stocks";
    if (view === "mf") return acc.account_type === "mf";
    return acc.account_name === view;
  });

  // Calculate filtered totals
  const filteredTotal = filteredAccounts.reduce(
    (acc, item) => ({
      invested: acc.invested + item.invested,
      current: acc.current + item.current,
      pnl: acc.pnl + item.pnl,
    }),
    { invested: 0, current: 0, pnl: 0 }
  );
  const filteredPnlPct = filteredTotal.invested ? (filteredTotal.pnl / filteredTotal.invested) * 100 : 0;

  // Get unique account names for the filter
  const accountNames = data.accounts.map((a) => a.account_name);

  return (
    <div className="space-y-4">
      {/* Grand Total Card */}
      <div className="bg-surface rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted uppercase tracking-wider font-medium">
            {view === "all" ? "Total Portfolio" : view === "stocks" ? "All Stocks" : view === "mf" ? "All Mutual Funds" : view}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs text-muted hover:text-foreground flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            {refreshing ? "Fetching..." : "Refresh"}
          </button>
        </div>
        <div className="text-3xl font-bold tracking-tight">{formatINR(filteredTotal.current)}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-sm font-medium ${pnlColor(filteredTotal.pnl)}`}>
            {formatINR(filteredTotal.pnl)}
          </span>
          <span className={`text-sm ${pnlColor(filteredPnlPct)}`}>
            ({formatPct(filteredPnlPct)})
          </span>
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted">
          <span>Invested: {formatINR(filteredTotal.invested)}</span>
        </div>
        {data.timestamp && (
          <div className="text-[10px] text-muted mt-2">{formatDate(data.timestamp)}</div>
        )}
      </div>

      {/* View Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {["all", "stocks", "mf"].map((key) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              view === key ? "bg-foreground text-background" : "bg-surface border border-border text-muted"
            }`}
          >
            {key === "all" ? "All" : key === "stocks" ? "Stocks" : "Mutual Funds"}
          </button>
        ))}
        <div className="w-px bg-border mx-1 my-1" />
        {accountNames.map((name) => (
          <button
            key={name}
            onClick={() => setView(name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              view === name ? "bg-foreground text-background" : "bg-surface border border-border text-muted"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Account Cards */}
      {filteredAccounts.map((acc) => (
        <div key={acc.account_id} className="bg-surface rounded-xl border border-border overflow-hidden">
          <button
            onClick={() => toggleAccount(acc.account_id)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-surface-hover"
          >
            <div>
              <div className="text-sm font-medium">{acc.account_name}</div>
              <div className="text-xs text-muted mt-0.5">{formatINR(acc.current)}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-medium ${pnlColor(acc.pnl)}`}>{formatINR(acc.pnl)}</div>
              <div className={`text-xs ${pnlColor(acc.pnl_pct)}`}>{formatPct(acc.pnl_pct)}</div>
            </div>
          </button>

          {expandedAccounts.has(acc.account_id) && (
            <div className="border-t border-border">
              {acc.holdings.map((h, idx) => (
                <div
                  key={h.id || idx}
                  className="px-4 py-2.5 flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{h.symbol_or_name}</div>
                    <div className="text-[11px] text-muted">
                      {h.qty_or_units.toFixed(acc.account_type === "mf" ? 3 : 0)} &times; ₹{h.avg_price_or_nav.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-sm">{formatINR(h.current)}</div>
                    <div className={`text-[11px] ${pnlColor(h.pnl)}`}>
                      {h.pnl != null ? `${formatINR(h.pnl)} (${formatPct(h.pnl_pct)})` : "N/A"}
                    </div>
                  </div>
                </div>
              ))}
              {/* Account footer */}
              <div className="px-4 py-2.5 bg-surface-hover flex justify-between text-xs text-muted">
                <span>Invested: {formatINR(acc.invested)}</span>
                <span>Current: {formatINR(acc.current)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
