import 'dotenv/config'
import { createLibp2p } from 'libp2p'
import { tcp } from '@libp2p/tcp'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify } from '@libp2p/identify'

const node = await createLibp2p({
  addresses: { listen: ['/ip4/0.0.0.0/tcp/0'] },
  transports: [tcp()],
  streamMuxers: [yamux()],
  connectionEncryption: [noise()],
  services: {
    // This must register the @libp2p/identify capability
    identify: identify(),
  }
})

await node.start()
console.log('[diag] started. peer id:', node.peerId.toString())
console.log('[diag] services keys:', Object.keys((node as any).services))
setTimeout(async () => {
  await node.stop()
  console.log('[diag] stopped')
  process.exit(0)
}, 2000)
