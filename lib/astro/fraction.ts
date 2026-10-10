/**
 * Exact rational arithmetic over bigint (mirrors Python's fractions.Fraction).
 * Vimshottari durations are never allowed to accumulate float error.
 */

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** 365.2425 days per year, exactly: 146097/400. */
export const DAYS_PER_YEAR_NUM = 146097n;
export const DAYS_PER_YEAR_DEN = 400n;

function floorDiv(n: bigint, d: bigint): bigint {
  let q = n / d;
  const r = n % d;
  if (r !== 0n && (r < 0n) !== (d < 0n)) q -= 1n;
  return q;
}

export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new Error("Fraction: zero denominator");
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }

  static of(value: number | bigint | string | Fraction): Fraction {
    if (value instanceof Fraction) return value;
    if (typeof value === "bigint") return new Fraction(value, 1n);
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Fraction: non-finite number");
      // Represent decimal numbers exactly by parsing their shortest decimal form.
      const s = value.toString();
      return Fraction.of(s);
    }
    const str = value.trim();
    const m = /^([+-]?\d+)(?:\.(\d+))?$/.exec(str);
    if (!m) throw new Error(`Fraction: cannot parse "${value}"`);
    const sign = m[1].startsWith("-") ? -1n : 1n;
    const intPart = BigInt(m[1]);
    const frac = m[2] ?? "";
    if (!frac) return new Fraction(intPart, 1n);
    const den = 10n ** BigInt(frac.length);
    const num = intPart * den + BigInt(frac) * sign;
    return new Fraction(num, den);
  }

  add(o: Fraction): Fraction {
    return new Fraction(this.n * o.d + o.n * this.d, this.d * o.d);
  }
  sub(o: Fraction): Fraction {
    return new Fraction(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Fraction): Fraction {
    return new Fraction(this.n * o.n, this.d * o.d);
  }
  div(o: Fraction): Fraction {
    if (o.n === 0n) throw new Error("Fraction: divide by zero");
    return new Fraction(this.n * o.d, this.d * o.n);
  }
  cmp(o: Fraction): number {
    const l = this.n * o.d;
    const r = o.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  isZero(): boolean {
    return this.n === 0n;
  }
  /** floor(this * 365.2425) in whole days. */
  floorDays(): bigint {
    return floorDiv(this.n * DAYS_PER_YEAR_NUM, this.d * DAYS_PER_YEAR_DEN);
  }
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export const frac = (value: number | bigint | string): Fraction => Fraction.of(value);
