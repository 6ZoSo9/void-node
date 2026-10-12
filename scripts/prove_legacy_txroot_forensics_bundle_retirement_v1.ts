import fs from "node:fs";
import path from "node:path";

const marker = "VOID_LEGACY_TXROOT_FORENSICS_BUNDLE_RETIREMENT_V1";

const indexTsPath = "src/index.ts";
const indexJsPath = "src/index.js";
const securityProofPath =
  "ops/security/public-sensitive-route-guard-proof.sh";
const wrapperPath =
  "src/diag/txroot_forensics_bundle_v5_v73.js";

function read(file: string): string {
  return fs.readFileSync(path.resolve(file), "utf8");
}

for (const file of [indexTsPath, securityProofPath]) {
  if (!fs.existsSync(path.resolve(file))) {
    throw new Error(`missing required file: ${file}`);
  }
}

if (fs.existsSync(path.resolve(wrapperPath))) {
  throw new Error(`retired wrapper still exists: ${wrapperPath}`);
}

const indexTs = read(indexTsPath);
const indexJs = fs.existsSync(path.resolve(indexJsPath))
  ? read(indexJsPath)
  : "";
const securityProof = read(securityProofPath);

const sources: Record<string, string> = {
  [indexTsPath]: indexTs,
  [indexJsPath]: indexJs,
  [securityProofPath]: securityProof,
};

const forbidden = [
  "txroot_forensics_bundle_v5_v73",
  "VOID_TXROOT_BUNDLE_LAZY",
  "__void_txroot_bundle_lazy_state",
  "__void_txroot_bundle_load_state",
  "__void_loaded_txroot_bundle_v5_v73",
  "/__void/diag/txroot_bundle_lazy/",
];

for (const [file, source] of Object.entries(sources)) {
  for (const token of forbidden) {
    if (source.includes(token)) {
      throw new Error(`legacy token remains in ${file}: ${token}`);
    }
  }
}

const retirementMarker = `[${marker}]`;
const retirementMarkerCount = indexTs.split(retirementMarker).length - 1;

if (retirementMarkerCount !== 1) {
  throw new Error(
    `expected exactly one retirement marker, found ${retirementMarkerCount}`,
  );
}

const requiredReplacementSurfaces = [
  "/__void/metrics/txroot4/forensics.prom",
  "/__void/metrics/wal.v3.prom",
  "/__void/metrics/wal.status.json",
  "WAL v7.4",
];

for (const surface of requiredReplacementSurfaces) {
  if (!indexTs.includes(surface)) {
    throw new Error(`current replacement surface missing: ${surface}`);
  }
}

console.log(
  `${marker}_GREEN`,
  JSON.stringify({
    retiredWrapperAbsent: true,
    staleLazyLoaderAbsent: true,
    staleEagerLoadersAbsent: true,
    obsoleteSensitiveRouteReferenceAbsent: true,
    currentTxrootForensicsPresent: true,
    currentWalV74PlusPresent: true,
    retirementMarkerCount,
  }),
);
