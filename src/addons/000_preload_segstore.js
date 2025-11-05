// preload seg_store so its prototype exists before wrappers mount
(async function preload(){ try{ await import('../chain/seg_store.ts'); }catch(e){ try{ await import('../chain/seg_store.js'); }catch(_e){} } })();
