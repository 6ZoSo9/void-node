import type { Express } from "express";

/**
 * Low-overhead JSON.parse sampler.
 * Enabled only when VOID_DIAG_JSONPARSE=1.
 *
 * Prints top callsites every 10s to stdout (journald).
 * Sampling: 1 stack capture per N parses (default N=4096).
 */
export function installJsonParseDiag(_app?: Express) {
  const enabled = process.env.VOID_DIAG_JSONPARSE === "1";
  if (!enabled) return;

  const sampleEvery = Math.max(16, Number.parseInt(process.env.VOID_DIAG_JSONPARSE_SAMPLE_EVERY || "4096", 10) || 4096);
  const maxKeys = Math.max(50, Number.parseInt(process.env.VOID_DIAG_JSONPARSE_MAX_KEYS || "200", 10) || 200);

  const orig = JSON.parse.bind(JSON) as any;

  let total = 0;
  let sampled = 0;

  // counts for (callsites + approximate input sizes)
  const counts = new Map<string, number>();
  const bytes = new Map<string, number>();

  function pickFrame(stack?: string): string {
    if (!stack) return "<no-stack>";
    const lines = stack.split("\n").map(s => s.trim());
    // Skip frames that are obviously inside JSON.parse / our wrapper / node internals.
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!ln.startsWith("at ")) continue;
      if (ln.includes("jsonparse_diag.ts")) continue;
      if (ln.includes("JSON.parse")) continue;
      if (ln.includes("Builtin_JsonParse")) continue;
      if (ln.includes("node:internal")) continue;
      if (ln.includes("(node:")) continue;
      // First "real" frame
      return ln.replace(/^at\s+/, "");
    }
    // Fallback: just return the 3rd line if present
    return (lines[2] || lines[1] || lines[0] || "<empty-stack>").replace(/^at\s+/, "");
  }

  function bump(k: string, nbytes: number) {
    counts.set(k, (counts.get(k) || 0) + 1);
    bytes.set(k, (bytes.get(k) || 0) + nbytes);

    // crude cap to avoid unbounded map growth
    if (counts.size > maxKeys) {
      // drop the lowest 10%
      const arr = Array.from(counts.entries()).sort((a,b)=>a[1]-b[1]);
      const drop = Math.ceil(arr.length * 0.10);
      for (let i = 0; i < drop; i++) {
        const key = arr[i][0];
        counts.delete(key);
        bytes.delete(key);
      }
    }
  }

  (JSON as any).parse = function patchedJsonParse(text: any, reviver?: any) {
    total++;
    // sample stack occasionally (cheap-ish) — keep it sparse
    if ((total % sampleEvery) === 0) {
      sampled++;
      const s = new Error().stack;
      const k = pickFrame(s);
      const nb = (typeof text === "string") ? text.length : 0;
      bump(k, nb);
    }
    return orig(text, reviver);
  };

  const start = Date.now();
  setInterval(() => {
    const up = ((Date.now() - start) / 1000).toFixed(0);
    const top = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 12);

    const lines: string[] = [];
    lines.push(`[jsonparse-diag] up=${up}s total=${total} sampled=${sampled} sampleEvery=${sampleEvery} unique=${counts.size}`);
    for (const [k, c] of top) {
      const b = bytes.get(k) || 0;
      const avg = c ? (b / c) : 0;
      lines.push(`  ${String(c).padStart(6)}  avgLen=${avg.toFixed(0).padStart(6)}  ${k}`);
    }
    // one compact log entry
    console.log(lines.join("\n"));
  }, 10_000).unref();

  console.log(`[jsonparse-diag] ENABLED sampleEvery=${sampleEvery} maxKeys=${maxKeys}`);
}
