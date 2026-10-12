import { createHash } from 'node:crypto';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

type Finding = Readonly<{
  id: string;
  ok: boolean;
  severity: 'blocker' | 'warn' | 'info';
  evidence: string;
}>;

type Context = Readonly<{
  ordinal: number;
  line: number;
  column: number;
  matchedText: string;
  hasValidateBlockForAppendNearby: boolean;
  hasExplicitInvalidImportedBlockNearby: boolean;
  context: readonly string[];
}>;

const NODE_CORE = 'src/node_core.ts';
const BLOCK_SOURCE = 'src/chain/block.ts';
const REPORT_JSON = 'docs/security/validate-block-for-append-saveblock-context-discovery-v2-report.json';
const REPORT_MD = 'docs/security/validate-block-for-append-saveblock-context-discovery-v2-report.md';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

const read = (path: string): string => existsSync(path) ? readFileSync(path, 'utf8') : '';
const nodeCore = read(NODE_CORE);
const blockSource = read(BLOCK_SOURCE);
const nodeLines = nodeCore.split(/\r?\n/);

const lineColFromIndex = (source: string, index: number): { line: number; column: number } => {
  const before = source.slice(0, index);
  const lines = before.split(/\r?\n/);
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

const getContext = (line: number, radius = 18): string[] => {
  const start = Math.max(1, line - radius);
  const end = Math.min(nodeLines.length, line + radius);
  const out: string[] = [];
  for (let current = start; current <= end; current += 1) {
    out.push(`${String(current).padStart(5, ' ')}: ${nodeLines[current - 1] ?? ''}`);
  }
  return out;
};

const nearbyText = (line: number, radius = 30): string => {
  const start = Math.max(1, line - radius);
  const end = Math.min(nodeLines.length, line + radius);
  return nodeLines.slice(start - 1, end).join('\n');
};

const matches: Array<{ index: number; matchedText: string }> = [];
for (const regex of [/\bsaveBlock\b/g, /\.save\s*\(/g, /\bputBlock\b/g, /\bappendBlock\b/g, /\bwriteBlock\b/g, /\bimportBlock\b/g]) {
  for (const match of nodeCore.matchAll(regex)) {
    if (typeof match.index === 'number') {
      matches.push({ index: match.index, matchedText: match[0] });
    }
  }
}

const deduped = Array.from(new Map(matches.map((m) => [`${m.index}:${m.matchedText}`, m])).values())
  .sort((a, b) => a.index - b.index);

const contexts: Context[] = deduped.map((match, idx) => {
  const pos = lineColFromIndex(nodeCore, match.index);
  const near = nearbyText(pos.line, 30);
  return {
    ordinal: idx + 1,
    line: pos.line,
    column: pos.column,
    matchedText: match.matchedText,
    hasValidateBlockForAppendNearby: /validateBlockForAppend/.test(near),
    hasExplicitInvalidImportedBlockNearby: /invalid imported block|validateBlockForAppend failed|ok:\s*false|reason:/i.test(near),
    context: getContext(pos.line, 18),
  };
});

const literalSaveBlockContexts = contexts.filter((ctx) => ctx.matchedText === 'saveBlock');
const unguardedLiteralSaveBlocks = literalSaveBlockContexts.filter((ctx) => !ctx.hasValidateBlockForAppendNearby);

const findings: Finding[] = [
  { id: 'node-core-present', ok: nodeCore.length > 0, severity: 'blocker', evidence: NODE_CORE },
  { id: 'block-source-present', ok: blockSource.length > 0, severity: 'blocker', evidence: BLOCK_SOURCE },
  { id: 'validateBlockForAppend-exported', ok: /export\s+(?:function|const)\s+validateBlockForAppend\b/.test(blockSource), severity: 'blocker', evidence: 'validateBlockForAppend export visible in src/chain/block.ts' },
  { id: 'node-core-references-validateBlockForAppend', ok: /validateBlockForAppend/.test(nodeCore), severity: 'blocker', evidence: 'src/node_core.ts references validateBlockForAppend somewhere' },
  { id: 'literal-saveBlock-call-sites-discovered', ok: literalSaveBlockContexts.length > 0, severity: 'blocker', evidence: `literal saveBlock matches=${literalSaveBlockContexts.length}` },
  { id: 'context-candidates-discovered', ok: contexts.length > 0, severity: 'warn', evidence: `all persistence-ish matches=${contexts.length}` },
  { id: 'unguarded-literal-saveBlock-count', ok: unguardedLiteralSaveBlocks.length === 0, severity: 'info', evidence: `unguarded literal saveBlock matches=${unguardedLiteralSaveBlocks.length}` },
];

const blockerFailures = findings.filter((f) => f.severity === 'blocker' && !f.ok).map((f) => f.id);
const warningFailures = findings.filter((f) => f.severity === 'warn' && !f.ok).map((f) => f.id);
const closureStatus = blockerFailures.length === 0 ? 'CONTEXT_DISCOVERY_READY' : 'CONTEXT_DISCOVERY_BLOCKED';

const report = {
  schema: 'VOID_VALIDATE_BLOCK_FOR_APPEND_SAVEBLOCK_CONTEXT_DISCOVERY_V2_REPORT',
  generatedAt: '1970-01-01T00:00:00.000Z',
  closureStatus,
  blockerFailures,
  warningFailures,
  nodeCoreSha256: sha256(nodeCore),
  blockSourceSha256: sha256(blockSource),
  literalSaveBlockCount: literalSaveBlockContexts.length,
  unguardedLiteralSaveBlockCount: unguardedLiteralSaveBlocks.length,
  contexts,
  findings,
  boundary: {
    staticSourceContextOnly: true,
    doesNotPatchCode: true,
    noForkChoiceClaim: true,
    noConsensusFinalityClaim: true,
    noWalletAuthority: true,
    noLedgerWrite: true,
    noValidatorAdmission: true,
    noSignerRotation: true,
    noAutonomousMutation: true,
  },
};

const findingLines = findings.map((f) => `- [${f.ok ? 'PASS' : 'FAIL'}] ${f.id} (${f.severity}): ${f.evidence}`).join('\n');
const contextLines = contexts.length === 0
  ? 'No persistence-ish contexts discovered by this static scanner.'
  : contexts.map((ctx) => [
      `### Context ${ctx.ordinal}: ${ctx.matchedText} at ${NODE_CORE}:${ctx.line}:${ctx.column}`,
      '',
      `- hasValidateBlockForAppendNearby: ${ctx.hasValidateBlockForAppendNearby}`,
      `- hasExplicitInvalidImportedBlockNearby: ${ctx.hasExplicitInvalidImportedBlockNearby}`,
      '',
      '```ts',
      ...ctx.context,
      '```',
    ].join('\n')).join('\n\n');

const md = `# validateBlockForAppend saveBlock context discovery v2\n\n- generated_at: ${report.generatedAt}\n- closure_status: ${report.closureStatus}\n- blocker_failures: ${blockerFailures.length ? blockerFailures.join(', ') : 'none'}\n- warning_failures: ${warningFailures.length ? warningFailures.join(', ') : 'none'}\n- node_core_sha256: ${report.nodeCoreSha256}\n- block_source_sha256: ${report.blockSourceSha256}\n- literal_saveBlock_count: ${report.literalSaveBlockCount}\n- unguarded_literal_saveBlock_count: ${report.unguardedLiteralSaveBlockCount}\n\n## Findings\n\n${findingLines}\n\n## Contexts\n\n${contextLines}\n\n## Boundary\n\nStatic/source context discovery only. This workflow deliberately does not patch code or claim fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation closure.\n`;

writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(REPORT_MD, md);

console.log(`VOID_VALIDATE_BLOCK_FOR_APPEND_SAVEBLOCK_CONTEXT_DISCOVERY_V2_STATUS=${closureStatus}`);
console.log(`LITERAL_SAVEBLOCK_COUNT=${literalSaveBlockContexts.length}`);
console.log(`UNGUARDED_LITERAL_SAVEBLOCK_COUNT=${unguardedLiteralSaveBlocks.length}`);
console.log('VOID_VALIDATE_BLOCK_FOR_APPEND_SAVEBLOCK_CONTEXT_DISCOVERY_V2_READY');
