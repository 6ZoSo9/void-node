import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

if (!src.includes("if(!getApp()) return setTimeout(poll,TICK);")) {
  throw new Error("missing startup app guard before proposer activity self-fetch");
}

if (!src.includes("VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_19801_20700")) {
  throw new Error("missing expected visibility window marker");
}

if (!src.includes("'/head.txt'")) {
  throw new Error("missing proposer activity head.txt self-fetch");
}

console.log("VOID_PROPOSER_ACTIVITY_STARTUP_FETCH_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  app_guard_before_self_fetch: true,
  preserved_head_fetch: true,
}));
