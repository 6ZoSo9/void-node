/* ADDR_STORE_EVENT_V1
   Shared address store for Obelisk UI tabs (Wallet + WorkCredits).
   - persists to localStorage
   - dispatches in-page event so tabs/components sync immediately
*/

export const ADDR_STORE_KEY = "obelisk_wallet_addr";
export const ADDR_CHANGE_EVENT = "obelisk:addr_change";

export function isHexAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test((a || "").trim());
}

export function normalizeAddress(a: string): string {
  const s = (a || "").trim();
  return isHexAddress(s) ? s : "";
}

export function getStoredAddress(fallback = ""): string {
  try {
    const v = localStorage.getItem(ADDR_STORE_KEY) || "";
    const n = normalizeAddress(v);
    return n || normalizeAddress(fallback) || "";
  } catch {
    return normalizeAddress(fallback) || "";
  }
}

export function setStoredAddress(addr: string): void {
  const n = normalizeAddress(addr);
  try {
    if (n) localStorage.setItem(ADDR_STORE_KEY, n);
    else localStorage.removeItem(ADDR_STORE_KEY);
  } catch {
    // ignore
  }

  // same-page sync (so switching tabs doesn't require reload)
  try {
    window.dispatchEvent(new CustomEvent(ADDR_CHANGE_EVENT, { detail: { address: n } }));
  } catch {
    // ignore
  }
}

export function subscribeStoredAddress(cb: (addr: string) => void): () => void {
  const handler = (ev: any) => {
    const a = String(ev?.detail?.address || "");
    cb(a);
  };
  try {
    window.addEventListener(ADDR_CHANGE_EVENT, handler as any);
  } catch {
    // ignore
  }
  return () => {
    try {
      window.removeEventListener(ADDR_CHANGE_EVENT, handler as any);
    } catch {
      // ignore
    }
  };
}
