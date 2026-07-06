import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = Readonly<{ id: string; ok: boolean; severity: 'blocker' | 'warn' | 'info'; evidence: string }>;
type SourceFile = Readonly<{ path: string; text: string }>;

const repoRoot = process.cwd();
const exists = (relative: string): boolean => fs.existsSync(path.join(repoRoot, relative));
const read = (relative: string): string => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const finding = (id: string, ok: boolean, severity: Finding['severity'], evidence: string): Finding => ({ id, ok, severity, evidence });
const hasAny = (text: string, patterns: readonly RegExp[]): boolean => patterns.some((pattern) => pattern.test(text));

const extractBody = (source: string, symbol: string): string | null => {
  const symbolIndex = source.indexOf(symbol);
  if (symbolIndex < 0) return null;
  const braceIndex = source.indexOf('{', symbolIndex);
  if (braceIndex < 0) return null;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let i = braceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(braceIndex, i + 1);
    }
  }
  return null;
};

const listTs = (dir: string): SourceFile[] => {
  if (!fs.existsSync(dir)) return [];
  const out: SourceFile[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!['node_modules', 'dist', 'build', '.git'].includes(ent.name)) out.push(...listTs(abs));
    } else if (ent.isFile() && ent.name.endsWith('.ts')) {
      out.push({ path: path.relative(repoRoot, abs), text: fs.readFileSync(abs, 'utf8') });
    }
  }
  return out;
};

const blockPath = 'src/chain/block.ts';
const blockText = exists(blockPath) ? read(blockPath) : '';
const validateIndex = blockText.indexOf('validateBlockForAppend');
const body = validateIndex >= 0 ? extractBody(blockText, 'validateBlockForAppend') : null;
const surface = validateIndex >= 0
  ? [blockText.slice(Math.max(0, validateIndex - 5000), validateIndex), body ?? '', blockText.slice(validateIndex, validateIndex + 5000)].join('\n')
  : '';

const findings: Finding[] = [];
findings.push(finding('block-source-present', blockText.length > 0, 'blocker', blockText.length > 0 ? `${blockPath} present` : `${blockPath} missing`));
findings.push(finding('validateBlockForAppend-present', validateIndex >= 0, 'blocker', validateIndex >= 0 ? 'symbol found' : 'symbol not found'));
findings.push(finding('validateBlockForAppend-exported', /export\s+(?:function|const)\s+validateBlockForAppend\b/.test(blockText), 'warn', 'exported function/const signature check'));
findings.push(finding('validateBlockForAppend-body-extracted', Boolean(body), 'blocker', body ? `body extracted (${body.length} bytes)` : 'body not extracted'));
findings.push(finding('parent-aware', Boolean(body && /parent|previous/i.test(body)), 'blocker', 'body references parent/previous'));
findings.push(finding('explicit-rejection-path', Boolean(body && (/return\s+false\b/.test(body) || /ok\s*:\s*false/.test(body) || /throw\s+new\s+Error/.test(body))), 'blocker', 'body has visible rejection path'));

const surfaceChecks: Array<readonly [string, readonly RegExp[], string]> = [
  ['parent-hash-linkage', [/previousHash/i, /prevHash/i, /parentHash/i, /parent\.hash/i], 'parent hash/linkage terms'],
  ['height-continuity', [/height/i, /blockNumber/i, /number/i, /index/i], 'height continuity terms'],
  ['block-identity-hash', [/hash.*block/i, /block.*hash/i, /sha/i, /digest/i, /compute.*hash/i, /calculate.*hash/i], 'block identity/hash terms'],
  ['roots-commitments', [/txRoot/i, /transaction.*root/i, /stateRoot/i, /receipt.*root/i, /epochRoot/i, /merkle/i, /commitment/i], 'root/commitment terms'],
  ['signature-proposer-authority', [/signature/i, /verify.*sign/i, /proposer/i, /authority/i, /allowlist/i, /validator/i], 'signature/proposer/authority terms'],
  ['broader-block-validation-delegation', [/validateBlock\s*\(/i, /validate.*Block/i, /verify.*Block/i], 'broader validation delegation terms'],
];
for (const [id, patterns, label] of surfaceChecks) findings.push(finding(id, hasAny(surface, patterns), 'warn', label));

const pullFiles = listTs(path.join(repoRoot, 'src')).filter((file) => /pullOnce/.test(file.text) && /saveBlock\s*\(/.test(file.text));
findings.push(finding('pullOnce-saveBlock-files-found', pullFiles.length > 0, 'blocker', pullFiles.length ? pullFiles.map((f) => f.path).join(', ') : 'none found'));
for (const file of pullFiles) {
  [...file.text.matchAll(/saveBlock\s*\(/g)].forEach((match, idx) => {
    const pos = match.index ?? 0;
    const win = file.text.slice(Math.max(0, pos - 1600), Math.min(file.text.length, pos + 600));
    findings.push(finding(`pullOnce-saveBlock-${file.path}-${idx + 1}-guarded`, /validateBlockForAppend\s*\(/.test(win), 'blocker', 'validateBlockForAppend near saveBlock'));
    findings.push(finding(`pullOnce-saveBlock-${file.path}-${idx + 1}-failure-reason`, /reason\s*:|invalid imported block|ok\s*:\s*false/i.test(win), 'warn', 'explicit failure reason near saveBlock'));
  });
}
findings.push(finding('peer-import-proof-script-present', exists('scripts/prove_peer_block_import_validation_boundary.ts'), 'blocker', 'peer import proof script present'));

const blockerFailures = findings.filter((f) => f.severity === 'blocker' && !f.ok);
const warningFailures = findings.filter((f) => f.severity === 'warn' && !f.ok);
const closureStatus = blockerFailures.length ? 'STATIC_PREFLIGHT_BLOCKED' : warningFailures.length ? 'STATIC_PREFLIGHT_BLOCKERS_CLEAR_WARNINGS_PRESENT' : 'STATIC_PREFLIGHT_FULLY_GREEN';
const report = {
  schema: 'VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_PREFLIGHT_REPORT_V1',
  generatedAt: new Date().toISOString(),
  closureStatus,
  blockerFailures: blockerFailures.map((f) => f.id),
  warningFailures: warningFailures.map((f) => f.id),
  findings,
  boundary: { staticSourceAuditOnly: true, noForkChoiceClaim: true, noConsensusFinalityClaim: true, noWalletAuthority: true, noLedgerWrite: true, noValidatorAdmission: true, noAutonomousMutation: true },
};
fs.writeFileSync(path.join(repoRoot, 'docs/security/validate-block-for-append-import-validation-closure-preflight-report-v1.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(repoRoot, 'docs/security/validate-block-for-append-import-validation-closure-preflight-report-v1.md'), [
  '# validateBlockForAppend import validation closure preflight report v1',
  '',
  `- generated_at: ${report.generatedAt}`,
  `- closure_status: ${closureStatus}`,
  `- blocker_failures: ${blockerFailures.length ? blockerFailures.map((f) => f.id).join(', ') : 'none'}`,
  `- warning_failures: ${warningFailures.length ? warningFailures.map((f) => f.id).join(', ') : 'none'}`,
  '',
  '## Findings',
  '',
  ...findings.map((f) => `- ${f.ok ? '[PASS]' : '[FAIL]'} ${f.id} (${f.severity}): ${f.evidence}`),
  '',
  '## Boundary',
  '',
  'Static/source preflight only. No fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation claim.',
  '',
].join('\n'));
console.log(`VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_PREFLIGHT_STATUS=${closureStatus}`);
console.log('VOID_VALIDATE_BLOCK_FOR_APPEND_IMPORT_VALIDATION_CLOSURE_PREFLIGHT_V1_READY');
