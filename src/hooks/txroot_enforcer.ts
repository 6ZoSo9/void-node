// src/hooks/txroot_enforcer.ts
/**
 * TXROOT Enforcer (universal no-op shim)
 * Exports BOTH named and default so any import style works:
 *   import { installTxrootEnforcer } from "./hooks/txroot_enforcer.js"
 *   import installTxrootEnforcer from "./hooks/txroot_enforcer.js"
 *   import * as txroot_enforcer from "./hooks/txroot_enforcer.js"; txroot_enforcer.installTxrootEnforcer?.(...)
 */

function _install(...args: any[]): void {
  try {
    const app = args && args.length > 0 ? args[0] : undefined;
    if (app && typeof (app as any).get === "function") {
      (app as any).get("/__void/txroot/enforcer/health", (_req: any, res: any) => {
        res.json({ ok: true, status: "noop", message: "txroot_enforcer.ts loaded (universal no-op)" });
      });
    }
  } catch {
    /* never throw from shim */
  }
}

// Named exports expected in various call-sites
export const installTxrootEnforcer = _install;
export const registerTxrootEnforcer = _install;

// Default export also points to the same function
export default _install;
