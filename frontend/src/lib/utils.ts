export function formatINR(val: number | null | undefined): string {
  if (val == null) return "N/A";
  const sign = val < 0 ? "-" : "";
  const abs = Math.abs(val);
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  }
  return `${sign}₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatPct(val: number | null | undefined): string {
  if (val == null) return "N/A";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(2)}%`;
}

export function pnlColor(val: number | null | undefined): string {
  if (val == null) return "text-muted";
  return val >= 0 ? "text-profit" : "text-loss";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
