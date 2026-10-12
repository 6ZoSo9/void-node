import { spawnSync } from "node:child_process";

type Finding = {
  id: string;
  status: "PASS" | "FAIL";
  detail: string;
};

function run(cmd: string, args: string[]): { code: number | null; stdout: string; stderr: string } {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  return {
    code: r.status,
    stdout: r.stdout.trim(),
    stderr: r.stderr.trim(),
  };
}

const findings: Finding[] = [];

const live = run("systemctl", ["--user", "is-active", "void-node-live.service"]);
const liveState = live.stdout || live.stderr || `exit=${live.code}`;

findings.push({
  id: "void-node-live-service-inactive",
  status: live.stdout === "inactive" || live.stdout === "failed" || live.stdout === "unknown" ? "PASS" : "FAIL",
  detail: `void-node-live.service=${liveState}`,
});

const staleRuntime = run("pgrep", ["-af", "node_modules/tsx.*src/index.ts|tools/public-node-safe-serve-v1.mjs"]);

findings.push({
  id: "no-stale-runtime-or-safe-serve-processes",
  status: staleRuntime.code === 1 && staleRuntime.stdout.length === 0 ? "PASS" : "FAIL",
  detail: staleRuntime.stdout.length ? staleRuntime.stdout : "no matching stale runtime processes",
});

const wcRelayer = run("pgrep", ["-af", "ops/wc-relayer-v1.cjs"]);
findings.push({
  id: "wc-relayer-not-blocking-repo-work",
  status: "PASS",
  detail: wcRelayer.stdout.length ? "wc relayer may be running; not a repo-work blocker" : "wc relayer not detected",
});

const wcHttp = run("pgrep", ["-af", "ops/void-workcredits-devnet-http.cjs"]);
findings.push({
  id: "workcredits-helper-not-blocking-repo-work",
  status: "PASS",
  detail: wcHttp.stdout.length ? "workcredits helper may be running; not a repo-work blocker" : "workcredits helper not detected",
});

const failures = findings.filter((f) => f.status === "FAIL");

for (const finding of findings) {
  console.log(`[${finding.status}] ${finding.id}: ${finding.detail}`);
}

if (failures.length) {
  console.error("VOID_REPO_WORK_RUNTIME_QUIESCENCE_PREFLIGHT_V1_FAIL");
  process.exit(1);
}

console.log("VOID_REPO_WORK_RUNTIME_QUIESCENCE_PREFLIGHT_V1_GREEN");
