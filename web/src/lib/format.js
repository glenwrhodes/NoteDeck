// Formatting helpers for the console look.

const pad = (n) => String(n).padStart(2, '0');

// 2026-11-18T14:32:00Z -> "2026.11.18 14:32" (in the viewer's local time)
export function stamp(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A note's per-user number as a record code: 7 -> "ND-0007"
export const recordCode = (number) => `ND-${String(number).padStart(4, '0')}`;

// 3725 -> "1H 02M 05S"
export function duration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}H ${pad(m)}M ${pad(s)}S`;
}
