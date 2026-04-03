"use client";

import { useEffect, useState } from "react";
import {
  getAccounts,
  getHoldings,
  createAccount,
  deleteAccount,
  addStockHolding,
  addMFHolding,
  updateHolding,
  deleteHolding,
  seedFromJson,
} from "@/lib/api";

type Account = {
  id: number;
  owner: string;
  broker: string;
  account_type: string;
  display_name: string;
};

type Holding = {
  id: number;
  account_id: number;
  symbol?: string;
  qty?: number;
  avg_price?: number;
  name?: string;
  scheme_code?: string;
  units?: number;
  avg_nav?: number;
};

export default function HoldingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Record<number, Holding[]>>({});
  const [expandedAccount, setExpandedAccount] = useState<number | null>(null);
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [showNewHolding, setShowNewHolding] = useState<number | null>(null);
  const [editingHolding, setEditingHolding] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // New account form
  const [newOwner, setNewOwner] = useState("");
  const [newBroker, setNewBroker] = useState("");
  const [newType, setNewType] = useState<"stocks" | "mf">("stocks");

  // New holding form
  const [newSymbol, setNewSymbol] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newAvgPrice, setNewAvgPrice] = useState("");
  const [newMFName, setNewMFName] = useState("");
  const [newSchemeCode, setNewSchemeCode] = useState("");
  const [newUnits, setNewUnits] = useState("");
  const [newAvgNav, setNewAvgNav] = useState("");

  // Edit holding form
  const [editQty, setEditQty] = useState("");
  const [editAvgPrice, setEditAvgPrice] = useState("");
  const [editUnits, setEditUnits] = useState("");
  const [editAvgNav, setEditAvgNav] = useState("");

  const fetchAccounts = async () => {
    try {
      const res = await getAccounts();
      setAccounts(res);
    } finally {
      setLoading(false);
    }
  };

  const fetchHoldings = async (accountId: number) => {
    const res = await getHoldings(accountId);
    setHoldings((prev) => ({ ...prev, [accountId]: res }));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleExpandAccount = async (id: number) => {
    if (expandedAccount === id) {
      setExpandedAccount(null);
      return;
    }
    setExpandedAccount(id);
    if (!holdings[id]) {
      await fetchHoldings(id);
    }
  };

  const handleCreateAccount = async () => {
    if (!newOwner || !newBroker) return;
    await createAccount({ owner: newOwner, broker: newBroker, account_type: newType });
    setShowNewAccount(false);
    setNewOwner("");
    setNewBroker("");
    fetchAccounts();
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm("Delete this account and all its holdings?")) return;
    await deleteAccount(id);
    fetchAccounts();
  };

  const handleAddStockHolding = async (accountId: number) => {
    if (!newSymbol || !newQty || !newAvgPrice) return;
    await addStockHolding(accountId, {
      symbol: newSymbol.toUpperCase(),
      qty: parseFloat(newQty),
      avg_price: parseFloat(newAvgPrice),
    });
    setShowNewHolding(null);
    setNewSymbol("");
    setNewQty("");
    setNewAvgPrice("");
    fetchHoldings(accountId);
  };

  const handleAddMFHolding = async (accountId: number) => {
    if (!newMFName || !newSchemeCode || !newUnits || !newAvgNav) return;
    await addMFHolding(accountId, {
      name: newMFName,
      scheme_code: newSchemeCode,
      units: parseFloat(newUnits),
      avg_nav: parseFloat(newAvgNav),
    });
    setShowNewHolding(null);
    setNewMFName("");
    setNewSchemeCode("");
    setNewUnits("");
    setNewAvgNav("");
    fetchHoldings(accountId);
  };

  const handleStartEdit = (h: Holding) => {
    setEditingHolding(h.id);
    setEditQty(String(h.qty ?? h.units ?? ""));
    setEditAvgPrice(String(h.avg_price ?? h.avg_nav ?? ""));
    setEditUnits(String(h.units ?? ""));
    setEditAvgNav(String(h.avg_nav ?? ""));
  };

  const handleSaveEdit = async (h: Holding) => {
    const isStock = h.symbol != null;
    if (isStock) {
      await updateHolding(h.id, { qty: parseFloat(editQty), avg_price: parseFloat(editAvgPrice) });
    } else {
      await updateHolding(h.id, { units: parseFloat(editUnits), avg_nav: parseFloat(editAvgNav) });
    }
    setEditingHolding(null);
    fetchHoldings(h.account_id);
  };

  const handleDeleteHolding = async (h: Holding) => {
    if (!confirm("Remove this holding?")) return;
    await deleteHolding(h.id);
    fetchHoldings(h.account_id);
  };

  const handleSeed = async () => {
    if (!confirm("Import holdings from holdings.json? This is a one-time import.")) return;
    try {
      await seedFromJson();
      fetchAccounts();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Seed failed");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Holdings</h2>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <button onClick={handleSeed} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted hover:text-foreground">
              Import JSON
            </button>
          )}
          <button
            onClick={() => setShowNewAccount(!showNewAccount)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-background"
          >
            + Account
          </button>
        </div>
      </div>

      {/* New Account Form */}
      {showNewAccount && (
        <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Owner (e.g. Lucky)"
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
            />
            <input
              placeholder="Broker (e.g. Groww)"
              value={newBroker}
              onChange={(e) => setNewBroker(e.target.value)}
              className="px-3 py-2 rounded-lg bg-background border border-border text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setNewType("stocks")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${newType === "stocks" ? "bg-foreground text-background" : "bg-background border border-border text-muted"}`}
            >
              Stocks
            </button>
            <button
              onClick={() => setNewType("mf")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${newType === "mf" ? "bg-foreground text-background" : "bg-background border border-border text-muted"}`}
            >
              Mutual Funds
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateAccount} className="px-4 py-2 rounded-lg text-xs font-medium bg-foreground text-background">
              Create
            </button>
            <button onClick={() => setShowNewAccount(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-muted">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      {accounts.map((acc) => (
        <div key={acc.id} className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => handleExpandAccount(acc.id)} className="text-left flex-1">
              <div className="text-sm font-medium">{acc.display_name}</div>
              <div className="text-[11px] text-muted">{acc.owner} &middot; {acc.broker} &middot; {acc.account_type === "stocks" ? "Stocks" : "Mutual Funds"}</div>
            </button>
            <button onClick={() => handleDeleteAccount(acc.id)} className="text-muted hover:text-loss p-1 ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>

          {expandedAccount === acc.id && (
            <div className="border-t border-border">
              {(holdings[acc.id] || []).map((h) => (
                <div key={h.id} className="px-4 py-2.5 border-b border-border last:border-b-0">
                  {editingHolding === h.id ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{h.symbol?.replace(".NS", "") || h.name}</div>
                      {h.symbol != null ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted">Qty</label>
                            <input value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted">Avg Price</label>
                            <input value={editAvgPrice} onChange={(e) => setEditAvgPrice(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.01" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted">Units</label>
                            <input value={editUnits} onChange={(e) => setEditUnits(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.001" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted">Avg NAV</label>
                            <input value={editAvgNav} onChange={(e) => setEditAvgNav(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.01" />
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(h)} className="px-3 py-1 rounded text-xs bg-foreground text-background">Save</button>
                        <button onClick={() => setEditingHolding(null)} className="px-3 py-1 rounded text-xs text-muted">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">{h.symbol?.replace(".NS", "") || h.name}</div>
                        <div className="text-[11px] text-muted">
                          {h.symbol != null
                            ? `${h.qty} qty @ ₹${h.avg_price?.toFixed(2)}`
                            : `${h.units?.toFixed(3)} units @ ₹${h.avg_nav?.toFixed(2)}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleStartEdit(h)} className="p-1.5 text-muted hover:text-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDeleteHolding(h)} className="p-1.5 text-muted hover:text-loss">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Holding */}
              {showNewHolding === acc.id ? (
                <div className="px-4 py-3 space-y-2 bg-surface-hover">
                  {acc.account_type === "stocks" ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Symbol" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" />
                        <input placeholder="Qty" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" />
                        <input placeholder="Avg Price" value={newAvgPrice} onChange={(e) => setNewAvgPrice(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.01" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddStockHolding(acc.id)} className="px-3 py-1 rounded text-xs bg-foreground text-background">Add</button>
                        <button onClick={() => setShowNewHolding(null)} className="px-3 py-1 rounded text-xs text-muted">Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input placeholder="Fund Name" value={newMFName} onChange={(e) => setNewMFName(e.target.value)} className="w-full px-2 py-1.5 rounded bg-background border border-border text-sm" />
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Scheme Code" value={newSchemeCode} onChange={(e) => setNewSchemeCode(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" />
                        <input placeholder="Units" value={newUnits} onChange={(e) => setNewUnits(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.001" />
                        <input placeholder="Avg NAV" value={newAvgNav} onChange={(e) => setNewAvgNav(e.target.value)} className="px-2 py-1.5 rounded bg-background border border-border text-sm" type="number" step="0.01" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddMFHolding(acc.id)} className="px-3 py-1 rounded text-xs bg-foreground text-background">Add</button>
                        <button onClick={() => setShowNewHolding(null)} className="px-3 py-1 rounded text-xs text-muted">Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowNewHolding(acc.id)}
                  className="w-full px-4 py-2.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover text-left"
                >
                  + Add Holding
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {accounts.length === 0 && (
        <div className="text-center py-12 text-muted text-sm">
          <p>No accounts yet.</p>
          <p className="mt-1">Create an account or import from holdings.json</p>
        </div>
      )}
    </div>
  );
}
