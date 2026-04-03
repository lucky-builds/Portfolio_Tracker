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
  // If the backend sends a naive datetime string without timezone, assume it is UTC.
  const dateStr = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
