/** Degree formatting helpers (DdegMM'SS"). */

export function formatDms(deg: number): string {
  const total = ((deg % 360) + 360) % 360;
  const d = Math.floor(total);
  const mFloat = (total - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  let dd = d;
  let mm = m;
  let ss = s;
  if (ss === 60) {
    ss = 0;
    mm += 1;
  }
  if (mm === 60) {
    mm = 0;
    dd += 1;
  }
  return `${dd}\u00b0${String(mm).padStart(2, "0")}\u2032${String(ss).padStart(2, "0")}\u2033`;
}

export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
