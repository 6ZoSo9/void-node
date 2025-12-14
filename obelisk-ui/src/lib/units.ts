export function isNumericString(x: unknown): x is string {
  return typeof x === "string" && /^[0-9]+$/.test(x);
}

/**
 * formatUnits for bigint/string/number WITHOUT losing precision.
 * - raw may be bigint, numeric string, or number (number is tolerated but discouraged).
 * - decimals default 18.
 */
export function formatUnits(raw: unknown, decimals: number = 18, opts?: { maxFrac?: number }): string {
  const maxFrac = opts?.maxFrac ?? 6;

  let bi: bigint;
  if (typeof raw === "bigint") bi = raw;
  else if (isNumericString(raw)) bi = BigInt(raw);
  else if (typeof raw === "number" && Number.isFinite(raw)) bi = BigInt(Math.trunc(raw));
  else return "—";

  if (!Number.isFinite(decimals) || decimals < 0) decimals = 0;

  const neg = bi < 0n;
  if (neg) bi = -bi;

  const base = 10n ** BigInt(decimals);
  const whole = bi / base;
  const frac = bi % base;

  if (decimals === 0) return (neg ? "-" : "") + whole.toString();

  let fracStr = frac.toString().padStart(decimals, "0");

  // trim trailing zeros
  fracStr = fracStr.replace(/0+$/, "");

  // cap fraction digits for UI readability (no rounding to avoid surprises)
  if (maxFrac >= 0 && fracStr.length > maxFrac) fracStr = fracStr.slice(0, maxFrac);

  const out = fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
  return (neg ? "-" : "") + out;
}
