import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { globSync } from "glob";
import path from "node:path";

const files = globSync("src/**/*.ts", { nodir: true, ignore: ["**/*.d.ts"] });

const extsKeep = new Set([".js", ".mjs", ".cjs", ".json", ".node", ".wasm"]);
const extsSkip = new Set([".css", ".scss", ".less", ".png", ".jpg", ".jpeg", ".svg", ".txt"]);

function shouldRewrite(spec) {
  if (!spec.startsWith("./") && !spec.startsWith("../")) return false;
  if (spec.startsWith("node:")) return false;
  const ext = path.extname(spec);
  if (extsKeep.has(ext) || extsSkip.has(ext)) return false;
  if (spec.endsWith("/")) return false;
  return ext === ""; // only bare specifiers
}

function targetExists(tsFile, spec) {
  // resolve against ts file dir; check likely TS sources (at author time)
  const dir = path.dirname(tsFile);
  const base = path.resolve(dir, spec);
  return (
    existsSync(base + ".ts") ||
    existsSync(base + ".tsx") ||
    existsSync(base + "/index.ts") ||
    existsSync(base + "/index.tsx")
  );
}

let changed = 0;
let touched = 0;

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let out = src;

  // import ... from "X"
  out = out.replace(
    /(from\s+)(['"])([^'"]+)\2/g,
    (m, pre, q, spec) => {
      if (!shouldRewrite(spec)) return m;
      if (!targetExists(f, spec)) return m;
      return `${pre}${q}${spec}.js${q}`;
    }
  );

  // export ... from "X"
  out = out.replace(
    /(export\s+[^;]*?\sfrom\s+)(['"])([^'"]+)\2/g,
    (m, pre, q, spec) => {
      if (!shouldRewrite(spec)) return m;
      if (!targetExists(f, spec)) return m;
      return `${pre}${q}${spec}.js${q}`;
    }
  );

  if (out !== src) {
    writeFileSync(f, out);
    changed++;
    touched++;
  }
}

console.log(`[ok] scanned=${files.length} changed_files=${touched}`);
