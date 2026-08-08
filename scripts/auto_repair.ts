import { autoRepairDataDir } from '../src/chain/auto_repair'

// Inputs from env (what the HTTP endpoint already sets)
const DATA_DIR = process.env.DATA_DIR || 'data'
const DRY_RUN  = process.env.DRY_RUN === '1'

const result = await autoRepairDataDir(DATA_DIR, {
  sparseEvery: 16,
  dryRun: DRY_RUN,
})

console.log(JSON.stringify(result, null, 2))
console.log(`[auto-repair] done (data_dir=${DATA_DIR}, dry=${DRY_RUN ? '1' : '0'}, mutations_applied=${result.mutationsApplied ? '1' : '0'})`)
