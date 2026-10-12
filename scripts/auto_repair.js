"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var auto_repair_1 = require("../src/chain/auto_repair");
// Inputs from env (what the HTTP endpoint already sets)
var DATA_DIR = process.env.DATA_DIR || 'data';
var DRY_RUN = process.env.DRY_RUN === '1';
// Call your library function. Adjust options to match your implementation.
await (0, auto_repair_1.autoRepairDataDir)(DATA_DIR, {
    sparseEvery: 16,
    // If your implementation supports dry-run, pass it through:
    // @ts-ignore - ok if not used by your function
    dryRun: DRY_RUN,
    // simple logger pass-through
    // @ts-ignore - ok if not used
    log: function () {
        var a = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            a[_i] = arguments[_i];
        }
        return console.log.apply(console, a);
    },
});
console.log("[auto-repair] done (data_dir=".concat(DATA_DIR, ", dry=").concat(DRY_RUN ? '1' : '0', ")"));
