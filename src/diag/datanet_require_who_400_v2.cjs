/* datanet_require_who_400_v2.cjs (SAFE)
   - Does NOT touch route.stack
   - app.use middleware rejects missing ?who= on publish/fetch
*/
function getApp() { return globalThis.__void_http_app || globalThis.__void_app || globalThis.app; }

const G = globalThis;
if (G.__dn_require_who_400_v2) {
  // already installed
} else {
  G.__dn_require_who_400_v2 = true;

  function mount(app) {
    if (!app || typeof app.use !== "function") return false;
    if (app.__dn_require_who_400_v2_mounted) return true;
    app.__dn_require_who_400_v2_mounted = true;

    app.use((req, res, next) => {
      try {
        const url = String(req.originalUrl || req.url || "");
        const isPublish = url.startsWith("/datanet/v1/publish");
        const isFetch = url.startsWith("/datanet/v1/fetch/");
        if (!isPublish && !isFetch) return next();

        const who = String((req.query && req.query.who) || "");
        if (!who) return res.status(400).json({ ok:false, error:"missing_who" });
      } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_REQUIRE_WHO_400_V2_CJS_1_1_VISIBLE", __void_diag_pack3_err); }
      next();
    });

    try { console.error("[dn_require_who_400_v2] mounted (safe app.use)"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_REQUIRE_WHO_400_V2_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
    return true;
  }

  const t0 = Date.now();
  const iv = setInterval(() => {
    const app = getApp();
    if (app && mount(app)) { clearInterval(iv); return; }
    if (Date.now() - t0 > 20000) clearInterval(iv);
  }, 200);
}
