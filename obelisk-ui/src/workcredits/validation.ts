export function isValidHexAddress(addr: string | undefined | null): boolean {
  if (!addr) return false;
  const trimmed = addr.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(trimmed);
}

export function parsePositiveAmount(raw: string | undefined | null): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n;
}
