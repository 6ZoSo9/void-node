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

  function isProtectedDataNetRequest(req){
    try {
      const method = String((req && req.method) || "");
      const raw = (req && (req.originalUrl || req.url)) || "";
      const path = (req && req.path) || new URL(raw, "http://127.0.0.1").pathname;
      return (
        (method === "POST" && path === "/datanet/v1/publish") ||
        (method === "GET" && path.startsWith("/datanet/v1/fetch/"))
      );
    } catch {
      return false;
    }
  }

  function holdIndeterminateRequest(res){
    const body = { ok: false, error: "datanet_who_guard_registration_indeterminate" };
    try {
      if (res && typeof res.status === "function") {
        const statusResponse = res.status(503);
        if (statusResponse && typeof statusResponse.json === "function") {
          statusResponse.json(body);
          return;
        }
      }
    } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_4_VISIBLE", __void_diag_pack3_err); }
    try {
      res.statusCode = 503;
      if (typeof res.setHeader === "function") res.setHeader("content-type", "application/json");
      if (typeof res.end === "function") res.end(JSON.stringify(body));
    } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_5_VISIBLE", __void_diag_pack3_err); }
  }

  function installIndeterminateHold(app){
    if (app.__void_datanet_require_who_v1_handle_guarded) return true;
    if (typeof app.handle !== "function") return false;
    const originalHandle = app.handle;
    const guardedHandle = function(req, res, next){
      if (
        app.__void_datanet_require_who_v1_mount_state !== "bound" &&
        isProtectedDataNetRequest(req)
      ) {
        holdIndeterminateRequest(res);
        return;
      }
      return originalHandle.call(app, req, res, next);
    };
    app.handle = guardedHandle;
    if (app.handle !== guardedHandle) return false;
    app.__void_datanet_require_who_v1_handle_guarded = true;
    return true;
  }

  function retainedMiddlewareState(app, middleware){
    let observedStack = false;
    for (const key of ["_router", "router"]) {
      try {
        const router = app && app[key];
        const stack = router && router.stack;
        if (!stack || typeof stack.length !== "number") continue;
        observedStack = true;
        for (let index = 0; index < stack.length; index += 1) {
          const layer = stack[index];
          if (layer && layer.handle === middleware) return true;
        }
      } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_6_VISIBLE", __void_diag_pack3_err); }
    }
    return observedStack ? false : null;
  }

  function middlewareFor(app){
    if (typeof app.__void_datanet_require_who_v1_middleware === "function") {
      return app.__void_datanet_require_who_v1_middleware;
    }
    const middleware = (req, res, next) => {
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
    };
    app.__void_datanet_require_who_v1_middleware = middleware;
    return middleware;
  }

  function mount(app){
    if (!app || typeof app.use !== "function") return false;
    if (app.__void_datanet_require_who_v1_mounted) {
      app.__void_datanet_require_who_v1_mount_state = "bound";
      return true;
    }
    if (app.__void_datanet_require_who_v1_mount_state === "bound") return true;
    if (app.__void_datanet_require_who_v1_mount_state === "indeterminate") return true;
    if (!installIndeterminateHold(app)) return false;

    const middleware = middlewareFor(app);
    app.__void_datanet_require_who_v1_mount_state = "indeterminate";
    try {
      app.use(middleware);
      app.__void_datanet_require_who_v1_mounted = true;
      app.__void_datanet_require_who_v1_mount_state = "bound";
    } catch (error) {
      const retained = retainedMiddlewareState(app, middleware);
      if (retained === true) {
        app.__void_datanet_require_who_v1_mounted = true;
        app.__void_datanet_require_who_v1_mount_state = "bound";
      } else if (retained === false) {
        app.__void_datanet_require_who_v1_mount_state = "idle";
      }
      throw error;
    }

    try { console.error("[datanet.require_who.v1] mounted"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
    return true;
  }

  function tick(){
    try {
      const app = G.__void_http_app;
      if (mount(app)) return;
    } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_PATCH_DATANET_REQUIRE_WHO_V1_CJS_1_3_VISIBLE", __void_diag_pack3_err); }
    const app = G.__void_http_app;
    if (
      app &&
      (app.__void_datanet_require_who_v1_mount_state === "bound" ||
        app.__void_datanet_require_who_v1_mount_state === "indeterminate")
    ) return;
    setTimeout(tick, 250);
  }

  tick();
})();
