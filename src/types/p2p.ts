export type PeerInfo = {
  id: string        // hex pubkey or node id
  host: string
  port: number
  seenAt: number
}
export type HelloMsg = {
  type: "hello"
  nodeId: string
  http: { host: string, port: number }
  p2p: { host: string, port: number }
  head?: number
  ts: number
}
export type HelloAck = {
  type: "hello_ack"
  nodeId: string
  ts: number
}
