import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { autoRepairDataDir } from '../dist/chain/auto_repair.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')

function frame(value) {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length, 0)
  return Buffer.concat([len, body])
}

function writeFixture(root) {
  const seg = path.join(root, 'segments', '00000000')
  fs.mkdirSync(seg, { recursive: true })

  const block0 = frame({ number: 0, payload: 'zero' })
  const block1 = frame({ number: 1, payload: 'one' })
  const tornBytes = 9
  fs.writeFileSync(
    path.join(seg, 'blocks.bin'),
    Buffer.concat([block0, block1.subarray(0, tornBytes)]),
  )
  fs.writeFileSync(path.join(seg, 'index.sparse'), '{"n":999,"off":999999}\n')
  fs.writeFileSync(
    path.join(seg, 'meta.json'),
    JSON.stringify({
      from: 0,
      to: 999,
      bytes: 999999,
      createdAt: 123456789,
      updatedAt: 123456790,
    }, null, 2),
  )
  fs.writeFileSync(
    path.join(root, 'heads.json'),
    JSON.stringify({ head: 999, number: 999, hash: 'poison-head' }, null, 2),
  )
  fs.writeFileSync(path.join(root, 'head.txt'), '999\n')
  return { block0, tornBytes }
}

function snapshotTree(root) {
  if (!fs.existsSync(root)) return { exists: false, entries: [] }
  const entries = []

  function walk(abs, rel) {
    const st = fs.lstatSync(abs)
    if (st.isDirectory()) {
      entries.push({ path: rel || '.', type: 'dir', mode: st.mode & 0o777 })
      for (const name of fs.readdirSync(abs).sort()) {
        walk(path.join(abs, name), rel ? path.join(rel, name) : name)
      }
      return
    }
    if (st.isSymbolicLink()) {
      entries.push({ path: rel, type: 'symlink', target: fs.readlinkSync(abs) })
      return
    }
    assert.equal(st.isFile(), true, `unexpected fixture entry type at ${abs}`)
    entries.push({
      path: rel,
      type: 'file',
      mode: st.mode & 0o777,
      bytes: fs.readFileSync(abs).toString('base64'),
    })
  }

  walk(root, '')
  return { exists: true, entries }
}

function normalizePlan(plan, root) {
  const rel = (p) => path.relative(root, p) || '.'
  return {
    createDirectories: plan.createDirectories.map(rel),
    createBlockFiles: plan.createBlockFiles.map(rel),
    truncateTornTails: plan.truncateTornTails.map((entry) => ({
      ...entry,
      path: rel(entry.path),
    })),
    rebuildSparseIndexes: plan.rebuildSparseIndexes.map((entry) => ({
      ...entry,
      path: rel(entry.path),
    })),
    rebuildSegmentMeta: plan.rebuildSegmentMeta.map((entry) => ({
      ...entry,
      path: rel(entry.path),
    })),
    reconcileHeads: {
      ...plan.reconcileHeads,
      headsJson: rel(plan.reconcileHeads.headsJson),
      headTxt: rel(plan.reconcileHeads.headTxt),
    },
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'void-auto-repair-dry-run-v1-'))
try {
  const dryDir = path.join(tmp, 'dry')
  const liveDir = path.join(tmp, 'live')
  const { block0, tornBytes } = writeFixture(dryDir)
  fs.cpSync(dryDir, liveDir, { recursive: true })

  const dryBefore = snapshotTree(dryDir)
  const dryResult = await autoRepairDataDir(dryDir, { sparseEvery: 16, dryRun: true })
  const dryAfter = snapshotTree(dryDir)

  assert.deepEqual(dryAfter, dryBefore, 'library dry-run mutated fixture filesystem')
  assert.equal(dryResult.ok, true)
  assert.equal(dryResult.dryRun, true)
  assert.equal(dryResult.mutationsApplied, false)
  assert.equal(dryResult.head, 0)
  assert.equal(dryResult.repairedTornSegments, 0)
  assert.equal(dryResult.tornTailBytesTruncated, 0)
  assert.equal(dryResult.wouldRepairTornSegments, 1)
  assert.equal(dryResult.wouldTruncateTornTailBytes, tornBytes)
  assert.equal(dryResult.plan.truncateTornTails.length, 1)
  assert.equal(dryResult.plan.truncateTornTails[0].fromBytes, block0.length + tornBytes)
  assert.equal(dryResult.plan.truncateTornTails[0].toBytes, block0.length)
  assert.equal(dryResult.plan.rebuildSparseIndexes.length, 1)
  assert.equal(dryResult.plan.rebuildSparseIndexes[0].entries, 1)
  assert.deepEqual(dryResult.plan.rebuildSegmentMeta[0], {
    segment: '00000000',
    path: path.join(dryDir, 'segments', '00000000', 'meta.json'),
    from: 0,
    to: 0,
    bytes: block0.length,
  })
  assert.equal(dryResult.plan.reconcileHeads.head, 0)

  const liveResult = await autoRepairDataDir(liveDir, { sparseEvery: 16, dryRun: false })
  assert.equal(liveResult.dryRun, false)
  assert.equal(liveResult.mutationsApplied, true)
  assert.equal(liveResult.repairedTornSegments, 1)
  assert.equal(liveResult.tornTailBytesTruncated, tornBytes)
  assert.equal(liveResult.wouldRepairTornSegments, dryResult.wouldRepairTornSegments)
  assert.equal(liveResult.wouldTruncateTornTailBytes, dryResult.wouldTruncateTornTailBytes)
  assert.deepEqual(
    normalizePlan(liveResult.plan, liveDir),
    normalizePlan(dryResult.plan, dryDir),
    'dry-run plan differed from live repair plan on identical fixtures',
  )

  const liveSeg = path.join(liveDir, 'segments', '00000000')
  assert.deepEqual(fs.readFileSync(path.join(liveSeg, 'blocks.bin')), block0)
  assert.equal(fs.readFileSync(path.join(liveSeg, 'index.sparse'), 'utf8'), '{"n":0,"off":0}\n')
  const rebuiltMeta = JSON.parse(fs.readFileSync(path.join(liveSeg, 'meta.json'), 'utf8'))
  assert.equal(rebuiltMeta.from, 0)
  assert.equal(rebuiltMeta.to, 0)
  assert.equal(rebuiltMeta.bytes, block0.length)
  assert.equal(rebuiltMeta.createdAt, 123456789)
  const rebuiltHeads = JSON.parse(fs.readFileSync(path.join(liveDir, 'heads.json'), 'utf8'))
  assert.equal(rebuiltHeads.head, 0)
  assert.equal(rebuiltHeads.number, 0)
  assert.equal(fs.readFileSync(path.join(liveDir, 'head.txt'), 'utf8'), '0\n')

  const malformedDir = path.join(tmp, 'malformed')
  const malformedSeg = path.join(malformedDir, 'segments', '00000000')
  fs.mkdirSync(malformedSeg, { recursive: true })
  const malformedBody = Buffer.from('{not-valid-json', 'utf8')
  const malformedLen = Buffer.alloc(4)
  malformedLen.writeUInt32BE(malformedBody.length, 0)
  fs.writeFileSync(
    path.join(malformedSeg, 'blocks.bin'),
    Buffer.concat([malformedLen, malformedBody]),
  )
  const malformedBefore = snapshotTree(malformedDir)
  await assert.rejects(
    autoRepairDataDir(malformedDir, { dryRun: true }),
    /complete frame JSON invalid/,
  )
  assert.deepEqual(
    snapshotTree(malformedDir),
    malformedBefore,
    'malformed complete frame dry-run mutated evidence',
  )

  const missingDir = path.join(tmp, 'missing')
  assert.equal(fs.existsSync(missingDir), false)
  const missingResult = await autoRepairDataDir(missingDir, { dryRun: true })
  assert.equal(fs.existsSync(missingDir), false, 'dry-run created a missing root')
  assert.equal(missingResult.dryRun, true)
  assert.equal(missingResult.mutationsApplied, false)
  assert.deepEqual(missingResult.plan.createDirectories, [
    missingDir,
    path.join(missingDir, 'segments'),
  ])
  assert.equal(missingResult.plan.reconcileHeads.head, -1)

  const operatorDir = path.join(tmp, 'operator')
  writeFixture(operatorDir)
  const operatorBefore = snapshotTree(operatorDir)
  const operatorSource = fs.readFileSync(path.join(repoRoot, 'scripts', 'auto_repair.ts'), 'utf8')
  assert.equal(operatorSource.includes('@ts-ignore'), false, 'operator script still suppresses option typing')
  assert.match(operatorSource, /dryRun:\s*DRY_RUN/)

  const tsxBin = path.join(repoRoot, 'node_modules', '.bin', 'tsx')
  assert.equal(fs.existsSync(tsxBin), true, `tsx binary missing at ${tsxBin}`)
  const operatorRun = spawnSync(tsxBin, ['scripts/auto_repair.ts'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      DATA_DIR: operatorDir,
      DRY_RUN: '1',
    },
    encoding: 'utf8',
  })
  assert.equal(operatorRun.status, 0, `operator dry-run failed: ${operatorRun.stderr}`)
  assert.deepEqual(
    snapshotTree(operatorDir),
    operatorBefore,
    'DRY_RUN=1 operator command mutated fixture filesystem',
  )
  assert.match(operatorRun.stdout, /"dryRun": true/)
  assert.match(operatorRun.stdout, /"mutationsApplied": false/)
  assert.match(operatorRun.stdout, /dry=1, mutations_applied=0/)

  console.log('VOID_SEGSTORE_AUTO_REPAIR_DRY_RUN_TRUTH_V1_PROOF_GREEN')
  console.log('dry_run_mutated_filesystem=false')
  console.log('dry_run_torn_tail_truncated=false')
  console.log('dry_run_reports_torn_tail_bytes=true')
  console.log('dry_run_reports_index_meta_head_rebuilds=true')
  console.log('live_repair_matches_dry_run_plan=true')
  console.log('complete_malformed_frame_dry_run_mutated=false')
  console.log('missing_root_created_in_dry_run=false')
  console.log('operator_dry_run_mutated_filesystem=false')
  console.log('operator_dry_run_typed=true')
  console.log('runtime_live_chain_mutation_performed=false')
  console.log('wallet_signer_validator_wc_money_authority=0')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
