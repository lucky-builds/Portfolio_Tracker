"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyPin } from "@/lib/api";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyPin(pin);
      localStorage.setItem("portfolio_pin", pin);
      router.replace("/");
    } catch {
      setError("Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Portfolio Tracker</h1>
          <p className="text-sm text-muted mt-2">Enter your PIN to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-foreground text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-foreground/20"
            autoFocus
          />
          {error && <p className="text-loss text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3 rounded-lg bg-foreground text-background font-medium text-sm disabled:opacity-40"
          >
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
