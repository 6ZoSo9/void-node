try{console.error("[datanet_receipt_bridge_v1] LOADED")}catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_1_VISIBLE", __void_diag_pack3_err); }
/* datanet_receipt_bridge_v1.cjs
   Purpose: emit /agent/v0/receipt on successful DataNet publish/fetch without touching core TS.
   Mechanism: wrap express() to wrap app.{post,get} registrations for the datanet routes, then on res.finish POST receipt JSON to localhost.
*/
const http = require("http");

function postJSON(urlPath, obj) {
  try {
    const body = Buffer.from(JSON.stringify(obj), "utf8");
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 4100,
        path: urlPath,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(body.length),
        },
        timeout: 1500,
      },
      (res) => {
        // drain quietly
        res.on("data", () => {});
        res.on("end", () => {});
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => {});
    req.write(body);
    req.end();
  } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_2_VISIBLE", __void_diag_pack3_err); }
}

function wrapHandler(kind, path, handler) {
  if (typeof handler !== "function") return handler;

  return function wrapped(req, res, next) {
    let captured = null;

    // capture JSON bodies if handler uses res.json/res.send(object|string)
    const _json = res.json && res.json.bind(res);
    const _send = res.send && res.send.bind(res);

    if (_json) {
      res.json = (obj) => {
        try { captured = obj; } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_3_VISIBLE", __void_diag_pack3_err); }
        return _json(obj);
      };
    }
    if (_send) {
      res.send = (obj) => {
        try {
          if (obj && typeof obj === "object") captured = obj;
          else if (typeof obj === "string" && obj.startsWith("{")) captured = JSON.parse(obj);
        } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_4_VISIBLE", __void_diag_pack3_err); }
        return _send(obj);
      };
    }

    res.once("finish", () => {
      try {
        const okHttp = (res.statusCode === 200);
        if (!okHttp) return;

        const now = Date.now();
        const who =
          (req && req.query && (req.query.who || req.query.WHO)) ||
          (req && req.headers && (req.headers["x-void-who"] || req.headers["x-who"])) ||
          "unknown";

        // dataset id: best effort from captured body or params
        const id =
          (captured && (captured.id || captured.datasetId || captured.key)) ||
          (req && req.params && (req.params.id || req.params.datasetId)) ||
          "";

        // For fetch, require verify_ok==true if present
        const verifyOk = (captured && typeof captured.verify_ok === "boolean") ? captured.verify_ok : true;
        if (!verifyOk) return;

        const receipt = {
          who: String(who),
          kind: "datanet",
          op: kind,                 // "publish" or "fetch"
          ok: 1,
          ts_ms: now,
          id: id ? String(id) : "",
          http_status: res.statusCode,
        };

        // attach helpful fields if present
        if (captured && captured.cipher_sha256_server) receipt.cipher_sha256 = String(captured.cipher_sha256_server);
        if (captured && captured.verify_ok !== undefined) receipt.verify_ok = !!captured.verify_ok;

        // fire-and-forget
        postJSON("/agent/v0/receipt", receipt);
      } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_5_VISIBLE", __void_diag_pack3_err); }
    });

    return handler(req, res, next);
  };
}

function wrapApp(app) {
  const methods = ["post", "get"];
  for (const m of methods) {
    const orig = app[m] && app[m].bind(app);
    if (!orig) continue;

    app[m] = function patched(path, ...handlers) {
      try {
        const p = String(path || "");
        const isPublish = (m === "post" && p === "/datanet/v1/publish");
        const isFetch = (m === "get" && (p === "/datanet/v1/fetch/:id" || p === "/datanet/v1/fetch/:datasetId"));

        if (isPublish || isFetch) {
          const kind = isPublish ? "publish" : "fetch";
          const wrapped = handlers.map((h) => wrapHandler(kind, p, h));
          return orig(path, ...wrapped);
        }
      } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_6_VISIBLE", __void_diag_pack3_err); }
      return orig(path, ...handlers);
    };
  }
  return app;
}

try {
  const real = require("express");

  function wrappedExpress(...args) {
    const app = real(...args);
    try { wrapApp(app); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_7_VISIBLE", __void_diag_pack3_err); }
    return app;
  }

  // copy static properties (Router, json, static, etc.)
  for (const k of Object.keys(real)) wrappedExpress[k] = real[k];

  // replace require cache export
  require.cache[require.resolve("express")].exports = wrappedExpress;

  try { console.error("[datanet_receipt_bridge_v1] armed"); } catch (__void_diag_pack3_err) { __voidSrcDiagPack3Visible("VOID_SRC_DIAG_DATANET_RECEIPT_PACK3_DATANET_RECEIPT_BRIDGE_V1_CJS_1_8_VISIBLE", __void_diag_pack3_err); }
} catch {
  // if express isn't resolvable, do nothing
}
