/* crypto-shim/v3 */
(function () {
  try {
    if (typeof globalThis.__void_getCreateHash !== "function") {
      const crypto = require("node:crypto");
      globalThis.__void_getCreateHash = function __void_getCreateHash(algo) {
        return crypto.createHash(algo);
      };
    }
    // Loud marker so we KNOW this file was required.
    process.stderr.write("[crypto-shim/v3] active __void_getCreateHash=" + (typeof globalThis.__void_getCreateHash) + "\n");
  } catch (e) {
    process.stderr.write("[crypto-shim/v3] ERROR " + (e && e.stack ? e.stack : String(e)) + "\n");
  }
})();
