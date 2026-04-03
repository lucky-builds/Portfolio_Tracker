"use client";

import { useEffect, useState } from "react";
import { getSnapshots, getSnapshot } from "@/lib/api";
import { formatINR, formatPct, pnlColor, formatDate } from "@/lib/utils";

type Snapshot = {
  id: number;
  timestamp: string;
  total_invested: number;
  total_current: number;
  total_pnl: number;
  total_pnl_pct: number;
};

type SnapshotDetail = {
  account_name: string;
  account_type: string;
  invested: number;
  current: number;
  pnl: number;
  pnl_pct: number;
};

type SnapshotFull = Snapshot & { details: SnapshotDetail[] };

export default function HistoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<SnapshotFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSnapshots(60).then(setSnapshots).finally(() => setLoading(false));
  }, []);

  const handleExpand = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    const data = await getSnapshot(id);
    setDetail(data);
  };

  // Calculate daily changes
  const withChanges = snapshots.map((snap, i) => {
    const prev = snapshots[i + 1]; // previous snapshot (list is desc by time)
    const dailyChange = prev ? snap.total_current - prev.total_current : null;
    const dailyChangePct = prev && prev.total_current ? ((snap.total_current - prev.total_current) / prev.total_current) * 100 : null;
    return { ...snap, dailyChange, dailyChangePct };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">History</h2>

      {snapshots.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          <p>No snapshots yet.</p>
          <p className="mt-1">Snapshots are taken at 6 AM &amp; 6 PM IST, or manually via refresh.</p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {/* Table header - desktop */}
          <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-2 text-[11px] text-muted uppercase tracking-wider border-b border-border font-medium">
            <div>Date</div>
            <div className="text-right">Invested</div>
            <div className="text-right">Current</div>
            <div className="text-right">P&L</div>
            <div className="text-right">Overall %</div>
            <div className="text-right">Daily Change</div>
          </div>

          {withChanges.map((snap) => (
            <div key={snap.id}>
              <button
                onClick={() => handleExpand(snap.id)}
                className="w-full hover:bg-surface-hover"
              >
                {/* Mobile layout */}
                <div className="md:hidden px-4 py-3 flex items-center justify-between">
                  <div className="text-left">
                    <div className="text-sm">{formatDate(snap.timestamp)}</div>
                    <div className="text-[11px] text-muted">{formatINR(snap.total_current)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${pnlColor(snap.total_pnl)}`}>{formatINR(snap.total_pnl)}</div>
                    {snap.dailyChange != null && (
                      <div className={`text-[11px] ${pnlColor(snap.dailyChange)}`}>
                        {formatINR(snap.dailyChange)} today
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-6 gap-2 px-4 py-2.5 text-sm border-b border-border">
                  <div>{formatDate(snap.timestamp)}</div>
                  <div className="text-right">{formatINR(snap.total_invested)}</div>
                  <div className="text-right">{formatINR(snap.total_current)}</div>
                  <div className={`text-right ${pnlColor(snap.total_pnl)}`}>{formatINR(snap.total_pnl)}</div>
                  <div className={`text-right ${pnlColor(snap.total_pnl_pct)}`}>{formatPct(snap.total_pnl_pct)}</div>
                  <div className={`text-right ${pnlColor(snap.dailyChange)}`}>
                    {snap.dailyChange != null ? `${formatINR(snap.dailyChange)} (${formatPct(snap.dailyChangePct)})` : "—"}
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === snap.id && detail && (
                <div className="bg-surface-hover px-4 py-3 space-y-2 border-b border-border">
                  {detail.details.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <div>
                        <span className="font-medium">{d.account_name}</span>
                        <span className="text-[11px] text-muted ml-2">{formatINR(d.current)}</span>
                      </div>
                      <div className={pnlColor(d.pnl)}>
                        {formatINR(d.pnl)} ({formatPct(d.pnl_pct)})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
