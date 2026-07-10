/* patch_datanet_require_who_v1.cjs
   Enforce ?who= on DataNet publish/fetch at the HTTP edge.
   Goal: missing_who becomes 400 and does NOT reach the handler.
*/
(function(){
  const G = globalThis;
  if (G.__void_datanet_require_who_v1) return;
  G.__void_datanet_require_who_v1 = true;

  function hasWho(req){
    try {
      const raw = (req && (req.originalUrl || req.url)) || "";
      const u = new URL(raw, "http://127.0.0.1");
      const who = u.searchParams.get("who");
      return !!(who && who.trim());
    } catch {
      return false;
    }
  }

  function mount(app){
    if (!app || typeof app.use !== "function") return false;
    if (app.__void_datanet_require_who_v1_mounted) return true;
    app.__void_datanet_require_who_v1_mounted = true;

    app.use((req, res, next) => {
      try {
        const path = (req && (req.path || "")) || "";
        const m = (req && (req.method || "")) || "";
        const isPublish = (m === "POST" && path === "/datanet/v1/publish");
        const isFetch = (m === "GET" && path.startsWith("/datanet/v1/fetch/"));
        if ((isPublish || isFetch) && !hasWho(req)) {
          res.status(400).json({ ok: false, error: "missing_who" });
          return;
        }
      } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_1_VISIBLE", __void_diag_pack3_err); }
      next();
    });

    try { console.error("[datanet.require_who.v1] mounted"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
    return true;
  }

  function tick(){
    try {
      const app = G.__void_http_app;
      if (mount(app)) return;
    } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_3_VISIBLE", __void_diag_pack3_err); }
    setTimeout(tick, 250);
  }

  tick();
})();
