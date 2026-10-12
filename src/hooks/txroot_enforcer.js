"use strict";
// src/hooks/txroot_enforcer.ts
/**
 * TXROOT Enforcer (universal no-op shim)
 * Exports BOTH named and default so any import style works:
 *   import { installTxrootEnforcer } from "./hooks/txroot_enforcer.js"
 *   import installTxrootEnforcer from "./hooks/txroot_enforcer.js"
 *   import * as txroot_enforcer from "./hooks/txroot_enforcer.js"; txroot_enforcer.installTxrootEnforcer?.(...)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTxrootEnforcer = exports.installTxrootEnforcer = void 0;
function _install() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    try {
        var app = args && args.length > 0 ? args[0] : undefined;
        if (app && typeof app.get === "function") {
            app.get("/__void/txroot/enforcer/health", function (_req, res) {
                res.json({ ok: true, status: "noop", message: "txroot_enforcer.ts loaded (universal no-op)" });
            });
        }
    }
    catch (_a) {
        /* never throw from shim */
    }
}
// Named exports expected in various call-sites
exports.installTxrootEnforcer = _install;
exports.registerTxrootEnforcer = _install;
// Default export also points to the same function
exports.default = _install;
