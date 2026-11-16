// Almacén local mínimo (IndexedDB) para la cola de envío y las fotos del modo demostración.
const DB = "cqa-campo";
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore("outbox"); r.result.createObjectStore("fotos"); };
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const out = fn(t.objectStore(store));
    t.oncomplete = () => res(out.result);
    t.onerror = () => rej(t.error);
  });
}
export const idbPut = (s, k, v) => tx(s, "readwrite", o => o.put(v, k));
export const idbGet = (s, k) => tx(s, "readonly", o => o.get(k));
export const idbDel = (s, k) => tx(s, "readwrite", o => o.delete(k));
export const idbAll = async s => {
  const db = await open();
  return new Promise((res, rej) => {
    const out = [];
    const q = db.transaction(s, "readonly").objectStore(s).openCursor();
    q.onsuccess = () => { const c = q.result; if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } else res(out); };
    q.onerror = () => rej(q.error);
  });
};
