export type FlagCheck = (now: number) => boolean;

const flags: Record<string, FlagCheck> = {
  // Example: enable strict txroot header enforcement after a block height
  "txroot.enforce": () => {
    const env = process.env.VOID_FEATURE_TXROOT_ENFORCE || "0";
    // formats: "0" | "1" | "epoch:150000" (block height threshold)
    if (env === "0") return false;
    if (env === "1") return true;
    if (env.startsWith("epoch:")) {
      const n = Number(env.slice(6));
      const cur = Number((globalThis as any).__void_head_number ?? -1);
      return Number.isFinite(n) && Number.isFinite(cur) && cur >= n;
    }
    return false;
  }
};

export function featureEnabled(name: string): boolean {
  const now = Date.now();
  const f = flags[name];
  return f ? !!f(now) : false;
}

// Strict mode: throw on mismatch instead of repairing
const strictFlag = () => {
  const env = process.env.VOID_FEATURE_TXROOT_ENFORCE_STRICT || "0";
  if (env === "1") return true;
  if (env.startsWith("epoch:")) {
    const n = Number(env.slice(6));
    const cur = Number((globalThis as any).__void_head_number ?? -1);
    return Number.isFinite(n) && Number.isFinite(cur) && cur >= n;
  }
  return false;
};
(Object.assign as any)(flags, { "txroot.enforce.strict": strictFlag });
