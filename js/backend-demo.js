// Modo demostración: todo queda en el teléfono (localStorage + IndexedDB). Sin cuenta ni SharePoint.
import { hoy } from "./util.js";
import { idbPut, idbGet } from "./idb.js";

const K = { temas: "cqa_demo_temas", reps: "cqa_demo_reportes", yo: "cqa_demo_yo" };
const mem = {};
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return k in mem ? JSON.parse(mem[k]) : def; } };
const guardar = (k, v) => { mem[k] = JSON.stringify(v); try { localStorage.setItem(k, mem[k]); } catch { /* memoria */ } };
const urls = new Map();

function semilla() {
  if (leer(K.temas, null)) return;
  const ahora = new Date().toISOString();
  guardar(K.temas, [
    { id: "1", titulo: "Control de compactación – Plataforma norte", area: "SUP", frente: "RUM", estado: "Abierto", descripcion: "Seguimiento diario de densidades y humedad.", autor: "Demostración", creado: ahora },
    { id: "2", titulo: "Levantamiento topográfico – Botadero", area: "Opción 3", frente: "TOL", estado: "Abierto", descripcion: "", autor: "Demostración", creado: ahora }
  ]);
  guardar(K.reps, [
    { id: "1", temaId: "1", fecha: hoy(), area: "SUP", frente: "RUM", tipo: "Reporte diario", texto: "Se realizaron 6 ensayos de densidad de campo en capa 3. Resultados dentro de especificación (≥ 95 % MDS).", nfotos: 0, autor: "Demostración", creado: ahora }
  ]);
}
semilla();

export const demo = {
  nombre: "Demostración (solo en este teléfono)",
  async yo() {
    let n = ""; try { n = localStorage.getItem(K.yo) || ""; } catch { /* sin almacenamiento */ }
    return n || "Colaborador demo";
  },
  async listTemas() { return leer(K.temas, []); },
  async createTema(t) {
    const l = leer(K.temas, []); const id = String(Math.max(0, ...l.map(x => +x.id)) + 1);
    l.push({ ...t, id, estado: "Abierto", autor: await this.yo(), creado: new Date().toISOString() });
    guardar(K.temas, l); return id;
  },
  async cerrarTema(id, estado) { guardar(K.temas, leer(K.temas, []).map(t => t.id === id ? { ...t, estado } : t)); },
  async listReportes({ temaId, fecha } = {}) {
    return leer(K.reps, []).filter(r => (!temaId || r.temaId === String(temaId)) && (!fecha || r.fecha === fecha));
  },
  async createReporte(r) {
    const l = leer(K.reps, []); const id = String(Math.max(0, ...l.map(x => +x.id)) + 1);
    l.push({ ...r, id, autor: await this.yo(), creado: new Date().toISOString() });
    guardar(K.reps, l); return id;
  },
  async subirFoto(datos, blob, n) { await idbPut("fotos", `${datos.fotoBase}-${n}`, blob); },
  async fotosDelDia(fecha) {
    const m = new Map();
    for (const r of leer(K.reps, []).filter(x => x.fecha === fecha && x.fotoBase)) {
      for (let n = 1; n <= (r.nfotos || 0); n++) {
        const key = `${r.fotoBase}-${n}`;
        if (!(await idbGet("fotos", key))) continue;
        if (!m.has(r.fotoBase)) m.set(r.fotoBase, []);
        m.get(r.fotoBase).push({ n, id: key });
      }
    }
    return m;
  },
  async fotoUrl(id) {
    if (!urls.has(id)) urls.set(id, URL.createObjectURL(await idbGet("fotos", id)));
    return urls.get(id);
  }
};
