"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePin } from "@/lib/api";

export default function SettingsPage() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChangePin = async () => {
    setError("");
    setMessage("");
    if (newPin !== confirmPin) {
      setError("New PINs don't match");
      return;
    }
    if (newPin.length < 4) {
      setError("PIN must be at least 4 characters");
      return;
    }
    try {
      await changePin(currentPin, newPin);
      localStorage.setItem("portfolio_pin", newPin);
      setMessage("PIN changed successfully");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change PIN");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("portfolio_pin");
    router.replace("/login");
  };

  return (
    <div className="space-y-6 max-w-md">
      <h2 className="text-lg font-semibold">Settings</h2>

      {/* Change PIN */}
      <div className="bg-surface rounded-xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-medium">Change PIN</h3>
        <input
          type="password"
          placeholder="Current PIN"
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
        <input
          type="password"
          placeholder="New PIN"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
        <input
          type="password"
          placeholder="Confirm New PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
        />
        {error && <p className="text-loss text-xs">{error}</p>}
        {message && <p className="text-profit text-xs">{message}</p>}
        <button
          onClick={handleChangePin}
          className="px-4 py-2 rounded-lg text-xs font-medium bg-foreground text-background"
        >
          Update PIN
        </button>
        <p className="text-[10px] text-muted">
          Note: PIN change persists until server restart. Update the AUTH_PIN environment variable on Railway for permanent change.
        </p>
      </div>

      {/* Logout */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg text-xs font-medium border border-border text-loss hover:bg-surface-hover"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
