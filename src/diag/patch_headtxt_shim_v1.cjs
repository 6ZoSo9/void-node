/* patch_headtxt_shim_v1.cjs
   Goal: restore /head.txt even when routes got shuffled/disabled.
   Strategy: wait for globalThis.__void_http_app (set early in src/index.ts), then mount /head.txt.
*/
(() => {
  if (globalThis.__void_headtxt_shim_v1_installed) return;
  globalThis.__void_headtxt_shim_v1_installed = true;

  const http = require("http");

  const VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_MARKER = "VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1";
  function recordVoidHeadtxtShimEmptyCatchVisibilityV1(site, err) {
    try {
      const g = globalThis;
      const key = "__void_headtxt_shim_empty_catch_visibility_v1";
      const bucket = Array.isArray(g[key]) ? g[key] : [];
      bucket.push({ marker: VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_MARKER, site: String(site || "unknown"), message: err && err.message ? String(err.message) : String(err || "") });
      while (bucket.length > 50) bucket.shift();
      g[key] = bucket;
    } catch (_visibilityRecordErr) {
      /* VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_RECORD_FAILURE_SUPPRESSED */
    }
  }

  function pickNumberFromUnknown(x) {
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string") {
      const m = x.match(/-?\d+/);
      if (m) {
        const n = Number(m[0]);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }

  function getHeadFromGlobals() {
    // common patterns we’ve used in VOID diag scripts
    const candidates = [
      globalThis.__void_head_last_number,
      globalThis.__void_head_number,
      globalThis.__void_last_head,
      globalThis.__void_head,
    ];
    for (const c of candidates) {
      const n = pickNumberFromUnknown(c);
      if (n != null) return n;
    }

    const st =
      globalThis.__void_seals_head_truthfix_v1_state ||
      globalThis.__void_sealshead_state ||
      globalThis.__void_seals_head_state;

    if (st && typeof st === "object") {
      for (const k of ["head", "head_number", "lastHead", "headLast", "headNum"]) {
        const n = pickNumberFromUnknown(st[k]);
        if (n != null) return n;
      }
    }

    const node =
      globalThis.__void_node ||
      globalThis.__void_nodecore ||
      globalThis.__voidNode ||
      globalThis.__node;

    if (node && typeof node === "object") {
      for (const path of [
        ["head"],
        ["core", "head"],
        ["chain", "head"],
        ["node", "head"],
        ["core", "chain", "head"],
      ]) {
        try {
          let cur = node;
          for (const p of path) cur = cur?.[p];
          const n = pickNumberFromUnknown(cur);
          if (n != null) return n;
        } catch (pathErr) { recordVoidHeadtxtShimEmptyCatchVisibilityV1("VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_SITE_GLOBAL_PATH_LOOKUP", pathErr); }
      }
    }

    return null;
  }

  function httpGetText(url, timeoutMs) {
    return new Promise((resolve) => {
      try {
        const req = http.get(url, (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve({ ok: res.statusCode === 200, status: res.statusCode || 0, body: data }));
        });
        req.on("error", () => resolve({ ok: false, status: 0, body: "" }));
        req.setTimeout(timeoutMs, () => {
          try { req.destroy(); } catch (destroyErr) { recordVoidHeadtxtShimEmptyCatchVisibilityV1("VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_SITE_REQ_DESTROY", destroyErr); }
          resolve({ ok: false, status: 0, body: "" });
        });
      } catch {
        resolve({ ok: false, status: 0, body: "" });
      }
    });
  }

  async function deriveHeadFromHttp(req) {
    const host = req.headers.host || "127.0.0.1:4100";
    const base = `http://${host}`;

    const paths = [
      "/blocks/latest/number",
      "/blocks/latest/height",
      "/blocks/latest",
      "/blocks/head",
      "/head",
    ];

    for (const p of paths) {
      const r = await httpGetText(base + p, 250);
      if (!r.ok) continue;

      // try plain number first
      let n = pickNumberFromUnknown(r.body);
      if (n != null) return n;

      // try JSON-ish
      try {
        const j = JSON.parse(r.body);
        for (const k of ["head", "number", "height", "n", "block", "blockNumber"]) {
          n = pickNumberFromUnknown(j?.[k]);
          if (n != null) return n;
        }
        n = pickNumberFromUnknown(j?.head?.number);
        if (n != null) return n;
      } catch (jsonErr) { recordVoidHeadtxtShimEmptyCatchVisibilityV1("VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_SITE_JSON_PARSE", jsonErr); }
    }

    return null;
  }

  function mountOnce() {
    const app = globalThis.__void_http_app;
    if (!app || typeof app.get !== "function") return false;
    if (app.__void_headtxt_shim_v1_mounted) return true;
    app.__void_headtxt_shim_v1_mounted = true;

    try {
      app.get("/head.txt", async (req, res) => {
        try {
          res.setHeader("content-type", "text/plain; charset=utf-8");
          let head = getHeadFromGlobals();
          if (head == null) head = await deriveHeadFromHttp(req);
          if (head == null) head = 0;
          res.status(200).send(String(head) + "\n");
        } catch (e) {
          try { res.status(200).send("0\n"); } catch (sendErr) { recordVoidHeadtxtShimEmptyCatchVisibilityV1("VOID_HEADTXT_SHIM_EMPTY_CATCH_VISIBILITY_V1_SITE_FALLBACK_SEND", sendErr); }
        }
      });

      console.error("[headtxt.shim.v1] mounted /head.txt");
      return true;
    } catch (e) {
      console.error("[headtxt.shim.v1] mount failed:", e?.message || e);
      return false;
    }
  }

  // retry for a bit until app exists
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (mountOnce() || tries > 240) {
      clearInterval(t);
      if (tries > 240) console.error("[headtxt.shim.v1] gave up (app never appeared)");
    }
  }, 250);
})();
