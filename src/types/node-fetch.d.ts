declare module "node-fetch" {
  const fetchDefault: typeof globalThis.fetch;
  export default fetchDefault;
}
