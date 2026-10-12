import fs from "node:fs";

const target = "src/index.ts";
const src = fs.readFileSync(target, "utf8");

if (!src.includes("const a3:any=(globalThis as any).__void_http_app")) {
  throw new Error("missing compact blocktxs_truth3 app resolver");
}

if (!src.includes("if(a3?.get){")) {
  throw new Error("missing non-throwing app guard");
}

if (src.includes('throw 0')) {
  throw new Error("throw-0 app guard remains");
}

if (!src.includes('a3.get("/__void/diag/blocktxs_truth3/_ping.json"')) {
  throw new Error("missing guarded truth3 ping route mount");
}

if (!src.includes('a3.get("/__void/diag/blocktxs_truth3/:n.json"')) {
  throw new Error("missing guarded truth3 numbered route mount");
}

if (src.includes('app.get("/__void/diag/blocktxs_truth3')) {
  throw new Error("unguarded direct app.get blocktxs_truth3 mount remains");
}

console.log("VOID_BLOCKTXS_TRUTH3_APP_GUARD_RUNTIME_VISIBILITY_V1_GREEN", JSON.stringify({
  target,
  guarded_app_mounts: 2,
  non_throwing_app_guard: true,
  unguarded_truth3_app_get_mounts: 0,
}));
