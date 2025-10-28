export type Tx = { hash: string; body: any }
export class VoidClient {
  constructor(public base = 'http://127.0.0.1:4100') {}
  async health() { return fetch(this.base + '/api/health').then(r=>r.json()) }
  async head() { return fetch(this.base + '/api/head').then(r=>r.json()) }
  async submit(tx: Tx) {
    return fetch(this.base + '/tx', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(tx) }).then(r=>r.json())
  }
}
