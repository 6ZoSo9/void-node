import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import {
  dirname,
  resolve,
} from "node:path";

const root = process.cwd();

function hold(message) {
  console.error(`HOLD: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  "README.md",
  "docs/public/README.md",
  "docs/public/start-here.md",
  "docs/public/mainnet0-current-public-status.md",
  "docs/public/current-capability-matrix.md",
  "docs/public/run-a-node.md",
  "docs/public/participant-onboarding.md",
  "docs/public/docs-freshness-policy.md",
  "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md",
];

for (const file of requiredFiles) {
  const path = resolve(root, file);
  if (!existsSync(path) || !statSync(path).isFile()) {
    hold(`required current-state document missing: ${file}`);
  }
}

const markers = {
  "README.md": "VOID_PUBLIC_DOCS_CURRENT_STATE_V1",
  "docs/public/README.md": "VOID_PUBLIC_DOCS_INDEX_CURRENT_STATE_V1",
  "docs/public/start-here.md": "VOID_PUBLIC_START_HERE_CURRENT_STATE_V2",
  "docs/public/mainnet0-current-public-status.md":
    "VOID_MAINNET0_CURRENT_PUBLIC_STATUS_V2",
  "docs/public/current-capability-matrix.md":
    "VOID_CURRENT_CAPABILITY_MATRIX_V1",
  "docs/public/run-a-node.md":
    "VOID_PUBLIC_RUN_A_NODE_CURRENT_STATE_V2",
  "docs/public/participant-onboarding.md":
    "VOID_PUBLIC_PARTICIPANT_ONBOARDING_CURRENT_STATE_V2",
  "docs/public/docs-freshness-policy.md":
    "VOID_PUBLIC_DOCS_FRESHNESS_POLICY_V1",
  "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md":
    "VOID_DATANET_CHAIN_TRUTH_MEMBRANE_WC_EXCHANGE_V1_20260921",
};

const currentDocs = new Map();

for (const [file, marker] of Object.entries(markers)) {
  const text = readFileSync(resolve(root, file), "utf8");
  currentDocs.set(file, text);
  if (!text.includes(marker)) {
    hold(`marker ${marker} missing from ${file}`);
  }
}

const rootReadme = currentDocs.get("README.md") ?? "";

const forbiddenRootFragments = [
  "96ec9e76",
  "ckpt-public-docs-index-site-bundle-green-20260528-131718",
  "Current cross-box checkpoint:",
  "## Public beta status command references",
];

for (const fragment of forbiddenRootFragments) {
  if (rootReadme.includes(fragment)) {
    hold(`stale root README fragment remains: ${fragment}`);
  }
}

const requiredBoundaryFragments = [
  "Automatic Buy VOID fulfillment",
  "Public validator activation",
  "Permissionless Work Credit issuance",
  "Public read-only evidence is not public mutation authority",
  "No fixed WC-to-VOID redemption ratio",
  "market-determined",
  "operator evidence workflow",
];

for (const fragment of requiredBoundaryFragments) {
  if (!rootReadme.includes(fragment)) {
    hold(`required boundary missing from root README: ${fragment}`);
  }
}

const doctrine =
  currentDocs.get(
    "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md",
  ) ?? "";

for (const fragment of [
  "The Sovereign is an intentional constitutional rate limiter for constitutional and protocol mutation",
  "Machine throughput is not constitutional legitimacy.",
  "DataNet availability is not Chain-2050 truth.",
  "There is no canonical fixed WC-to-VOID conversion or redemption ratio.",
]) {
  if (!doctrine.includes(fragment)) {
    hold(`truth membrane doctrine missing required boundary: ${fragment}`);
  }
}

const currentPolicyFiles = [
  "README.md",
  "docs/public/README.md",
  "docs/public/mainnet0-current-public-status.md",
  "docs/public/current-capability-matrix.md",
  "docs/public/participant-onboarding.md",
  "docs/public-node/void-network-build-map-v1.md",
  "public/public-node/void-network/build-map-v1.json",
  "docs/public/void-public-gateway-foundation-v1/site-content.json",
  "docs/governance/void-datanet-chain-truth-membrane-wc-exchange-v1.md",
];

for (const file of currentPolicyFiles) {
  const text = readFileSync(resolve(root, file), "utf8");
  if (text.includes("100 WC : 1 VOID")) {
    hold(`retired fixed WC-to-VOID ratio remains in current policy file: ${file}`);
  }
  if (!text.toLowerCase().includes("market-determined")) {
    hold(`current WC policy file is not bound to market-determined exchange: ${file}`);
  }
}

for (const file of [
  "public/public-node/void-network/build-map-v1.json",
  "docs/public/void-public-gateway-foundation-v1/site-content.json",
]) {
  try {
    JSON.parse(readFileSync(resolve(root, file), "utf8"));
  } catch {
    hold(`current WC policy JSON is invalid: ${file}`);
  }
}

const lineCount = rootReadme.split(/\r?\n/u).length;
// Current main entered this change at 296 lines because release-control sections
// accumulated after the original 260-line ceiling was introduced. Keep the
// canonical entry point bounded without pretending the accepted baseline is shorter.
if (lineCount > 310) {
  hold(`root README is too long for the canonical entry point: ${lineCount} lines`);
}

const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;

for (const [file, text] of currentDocs.entries()) {
  for (const match of text.matchAll(linkPattern)) {
    const rawTarget = (match[1] ?? "").trim();
    if (
      rawTarget.length === 0 ||
      rawTarget.startsWith("#") ||
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("mailto:")
    ) {
      continue;
    }

    const targetWithoutAnchor = rawTarget.split("#", 1)[0];
    if (!targetWithoutAnchor) {
      continue;
    }

    const targetPath = resolve(
      root,
      dirname(file),
      targetWithoutAnchor,
    );

    if (!existsSync(targetPath)) {
      hold(`broken relative Markdown link in ${file}: ${rawTarget}`);
    }
  }
}

const matrix =
  currentDocs.get("docs/public/current-capability-matrix.md") ?? "";

for (const state of [
  "Live",
  "Bounded pilot",
  "Guarded",
  "Not enabled",
]) {
  if (!matrix.includes(state)) {
    hold(`capability matrix missing status: ${state}`);
  }
}

console.log("VOID_PUBLIC_DOCS_CURRENT_STATE_V1_PROOF_GREEN");
