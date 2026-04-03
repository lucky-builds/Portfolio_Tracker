const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getPin(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("portfolio_pin") || "";
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-auth-pin": getPin(),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("portfolio_pin");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// Auth
export const verifyPin = (pin: string) =>
  apiFetch("/api/auth/verify", { method: "POST", body: JSON.stringify({ pin }) });

export const changePin = (current_pin: string, new_pin: string) =>
  apiFetch("/api/auth/change-pin", { method: "POST", body: JSON.stringify({ current_pin, new_pin }) });

// Portfolio
export const getPortfolio = () => apiFetch("/api/portfolio");
export const triggerSnapshot = () => apiFetch("/api/portfolio/snapshot", { method: "POST" });

// Accounts
export const getAccounts = () => apiFetch("/api/accounts");
export const createAccount = (data: { owner: string; broker: string; account_type: string }) =>
  apiFetch("/api/accounts", { method: "POST", body: JSON.stringify(data) });
export const deleteAccount = (id: number) =>
  apiFetch(`/api/accounts/${id}`, { method: "DELETE" });

// Holdings
export const getHoldings = (accountId: number) =>
  apiFetch(`/api/accounts/${accountId}/holdings`);
export const addStockHolding = (accountId: number, data: { symbol: string; qty: number; avg_price: number }) =>
  apiFetch(`/api/accounts/${accountId}/holdings/stock`, { method: "POST", body: JSON.stringify(data) });
export const addMFHolding = (accountId: number, data: { name: string; scheme_code: string; units: number; avg_nav: number }) =>
  apiFetch(`/api/accounts/${accountId}/holdings/mf`, { method: "POST", body: JSON.stringify(data) });
export const updateHolding = (id: number, data: Record<string, unknown>) =>
  apiFetch(`/api/holdings/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteHolding = (id: number) =>
  apiFetch(`/api/holdings/${id}`, { method: "DELETE" });

// Snapshots
export const getSnapshots = (limit = 60, offset = 0) =>
  apiFetch(`/api/snapshots?limit=${limit}&offset=${offset}`);
export const getSnapshot = (id: number) =>
  apiFetch(`/api/snapshots/${id}`);

// Seed
export const seedFromJson = () =>
  apiFetch("/api/seed", { method: "POST" });
