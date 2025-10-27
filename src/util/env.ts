// Lightweight env bridge with sane defaults (additive; does not override existing code)
export type EnvConfig = {
  DATA_DIR: string
  HTTP_HOST: string
  HTTP_PORT: number
  P2P_HOST: string
  P2P_PORT: number
  BOOTSTRAP_ADDRS: string[]
  NODE_KEY_PATH?: string
}
export function loadEnv(): EnvConfig {
  const DATA_DIR = process.env.DATA_DIR || process.env.VOID_DATA_DIR || "data"
  const HTTP_HOST = process.env.HTTP_HOST || "127.0.0.1"
  const HTTP_PORT = parseInt(process.env.HTTP_PORT || process.env.VOID_HTTP_PORT || "4100", 10)
  const P2P_HOST = process.env.P2P_HOST || "127.0.0.1"
  const P2P_PORT = parseInt(process.env.P2P_PORT || "4700", 10)
  const BOOTSTRAP_ADDRS = (process.env.BOOTSTRAP_ADDRS || "")
    .split(",").map(s => s.trim()).filter(Boolean)
  const NODE_KEY_PATH = process.env.VOID_NODE_KEY_A || process.env.NODE_PRIVKEY_PATH
  return { DATA_DIR, HTTP_HOST, HTTP_PORT, P2P_HOST, P2P_PORT, BOOTSTRAP_ADDRS, NODE_KEY_PATH }
}
