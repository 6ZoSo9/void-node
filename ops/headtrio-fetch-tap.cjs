/* headtrio-fetch-tap.cjs
   Logs stack for global fetch() calls to head trio URLs, rate-limited.
   Also drops a marker in /tmp so we can prove the preload ran.
*/
(function(){
  try {
    const fs = require("fs");
    fs.appendFileSync("/tmp/void-fetch-tap.loaded.log", new Date().toISOString()+" __void_fetch_tap_loaded_marker_v2\n");
    console.error("[fetch.tap] LOADED __void_fetch_tap_loaded_marker_v2");
  } catch (e) {
    console.error("[fetch.tap] VOID_OPS_HEADTRIO_FETCH_TAP_LOAD_LOG_VISIBLE", e && e.message ? e.message : e);
  }

  if (process.env.VOID_FETCH_TAP_HEADTRIO !== "1") return;

  const G = globalThis;
  const orig = G.fetch;
  if (typeof orig !== "function") return;

  if (G.__void_fetch_tap_headtrio_installed) return;
  G.__void_fetch_tap_headtrio_installed = true;

  function isHeadTrio(s){
    const isNum2 = s.includes("/blocks/latest/number2");
    const isNum  = (!isNum2 && s.includes("/blocks/latest/number"));
    const isHead = s.includes("/head.txt.txt");
    return isHead || isNum2 || isNum;
  }

  G.fetch = async function(input, init){
    try {
      const s = String((input && input.url) ? input.url : input);
      if (isHeadTrio(s)) {
        const now = Date.now();
        G.__void_fetch_tap_hits = (G.__void_fetch_tap_hits||0) + 1;
        const last = Number(G.__void_fetch_tap_last_ms||0);
        if ((now - last) > 2000) {
          G.__void_fetch_tap_last_ms = now;
          const st = (new Error("fetch.tap.headtrio")).stack || "";
          const st8 = st.split("\n").slice(0,9).join("\n");
          try { console.error("[fetch.tap.headtrio]", "hits="+G.__void_fetch_tap_hits, s, st8); } catch (e) { process.stderr.write("[fetch.tap.headtrio] VOID_OPS_HEADTRIO_FETCH_TAP_CONSOLE_VISIBLE "+String(e && e.message ? e.message : e)+"\n"); }
        }
      }
    } catch (e) {
      if (!G.__void_ops_headtrio_fetch_tap_runtime_seen) {
        G.__void_ops_headtrio_fetch_tap_runtime_seen = true;
        console.error("[fetch.tap.headtrio] VOID_OPS_HEADTRIO_FETCH_TAP_RUNTIME_VISIBLE", e && e.message ? e.message : e);
      }
    }
    return orig.apply(this, arguments);
  };
})();
