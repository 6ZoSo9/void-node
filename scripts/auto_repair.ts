import { autoRepairDataDir } from '../src/chain/auto_repair'

// Inputs from env (what the HTTP endpoint already sets)
const DATA_DIR = process.env.DATA_DIR || 'data'
const DRY_RUN  = process.env.DRY_RUN === '1'

// Call your library function. Adjust options to match your implementation.
await autoRepairDataDir(DATA_DIR, {
  sparseEvery: 16,
  // If your implementation supports dry-run, pass it through:
  // @ts-ignore - ok if not used by your function
  dryRun: DRY_RUN,
  // simple logger pass-through
  // @ts-ignore - ok if not used
  log: (...a: any[]) => console.log(...a),
})

console.log(`[auto-repair] done (data_dir=${DATA_DIR}, dry=${DRY_RUN ? '1' : '0'})`)
