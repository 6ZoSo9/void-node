import type { Express } from 'express'
import { collectDefaultMetrics, Counter, Registry } from 'prom-client'

const registry = new Registry()
collectDefaultMetrics({ register: registry })

// Useful counters (extend later)
export const blocksAppended = new Counter({
  name: 'void_blocks_appended_total',
  help: 'Total number of blocks appended to local store',
  registers: [registry]
})

export const followerPulls = new Counter({
  name: 'void_follower_pulls_total',
  help: 'Total follower pull iterations',
  registers: [registry]
})

export function mountMetrics(app: Express) {
  app.get('/metrics', async (_req, res) => {
    try {
      res.setHeader('Content-Type', registry.contentType)
      res.send(await registry.metrics())
    } catch (e:any) {
      res.status(500).send(String(e?.message || e))
    }
  })
}
