// Modo demostración: todo queda en el teléfono (localStorage + IndexedDB). Sin cuenta ni SharePoint.
import { hoy } from "./util.js";
import { idbPut, idbGet } from "./idb.js";

const K = { rep: "cqa_demo_reportes", res: "cqa_demo_respuestas", col: "cqa_demo_colabs" };
const mem = {};
const leer = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return k in mem ? JSON.parse(mem[k]) : def; } };
const guardar = (k, v) => { mem[k] = JSON.stringify(v); try { localStorage.setItem(k, mem[k]); } catch { /* memoria */ } };
const urls = new Map();
const ME = { nombre: "Juan Pérez Quispe", email: "juan.perez@demo.pe" };
const sig = l => String(Math.max(0, ...l.map(x => +x.id)) + 1);

function semilla() {
  if (leer(K.col, null)) return;
  const c = (id, nombres, apellidos, cargo, empresa, areas, rol = "Colaborador") => ({ id, email: `${nombres}.${apellidos.split(" ")[0]}@demo.pe`.toLowerCase(),
    nombres, apellidos, dni: "4000000" + id, celular: "+51 9" + id.repeat(8).slice(0, 8), cargo, empresa, empresaOtros: "", areas, grupo: "", rol, estado: "Activo",
    registrado: "2026-10-06", historial: "", nombre: `${nombres} ${apellidos}` });
  guardar(K.col, [
    { ...c("1", "Juan", "Pérez Quispe", "Supervisor QA", "Clean Technology", ["GAV", "TOL"], "Supervisor"), email: ME.email },
    c("2", "Ana", "Ríos Vega", "Jefe de laboratorio", "Ecosermy", ["RUM", "ESC", "TOL"]),
    c("3", "Luis", "Quispe Mamani", "Técnico de laboratorio", "Ecosempo", ["TOL"]),
    c("4", "Carla", "Soto Lima", "Topógrafo", "Volcan", ["GAV", "TOL", "RUM", "ESC", "CDS", "OTR"])]);
  const ahora = Date.now(), iso = m => new Date(ahora - m * 60000).toISOString();
  guardar(K.rep, [
    { id: "1", titulo: "Vaciado de losa eje 3", area: "TOL", lugar: "", fecha: hoy(), descripcion: "Se realizó el vaciado de la losa del eje 3 con concreto f'c 210 kg/cm².", tipo: "Reporte",
      estado: "Observado", fijado: false, cargo: "Supervisor QA", empresa: "Clean Technology", esp: "SUP", autorEmail: ME.email, fotoBase: "", nfotos: 0, ultima: iso(20), autorNombre: ME.nombre, creado: iso(120) },
    { id: "2", titulo: "Control de compactación", area: "GAV", lugar: "", fecha: hoy(-1), descripcion: "Seis ensayos de densidad de campo en capa 3.", tipo: "Reporte", estado: "Abierto", fijado: false,
      cargo: "Topógrafo", empresa: "Volcan", esp: "Opción 3", autorEmail: "carla.soto@demo.pe", fotoBase: "", nfotos: 0, ultima: iso(1500), autorNombre: "Carla Soto Lima", creado: iso(1500) },
    { id: "3", titulo: "Instrucciones de la semana", area: "GAV", lugar: "", fecha: hoy(), descripcion: "Usar siempre el formato nuevo de reporte.", tipo: "Tema general", estado: "Abierto", fijado: true,
      cargo: "Jefe de laboratorio", empresa: "Ecosermy", esp: "LAB", autorEmail: "ana.ríos@demo.pe", fotoBase: "", nfotos: 0, ultima: iso(300), autorNombre: "Ana Ríos Vega", creado: iso(300) }]);
  guardar(K.res, [
    { id: "1", temaId: "1", kind: "Observación", texto: "Falta foto del ensayo slump.", adjuntos: [], oculta: false, cargo: "Jefe de laboratorio", empresa: "Ecosermy", autorEmail: "ana.ríos@demo.pe", autorNombre: "Ana Ríos Vega", creado: iso(60) },
    { id: "2", temaId: "1", kind: "Respuesta", texto: "", adjuntos: [{ t: "enlace", url: "https://example.com/plano-losa" }], oculta: false, cargo: "Técnico de laboratorio", empresa: "Ecosempo", autorEmail: "luis.quispe@demo.pe", autorNombre: "Luis Quispe Mamani", creado: iso(40) }]);
}
semilla();

export const demo = {
  nombre: "Demostración (solo en este teléfono)",
  async yo() { return ME; },
  async listColaboradores() { return leer(K.col, []); },
  async saveColaborador(c, cambio) {
    const l = leer(K.col, []);
    const reg = { ...c, nombre: `${c.nombres} ${c.apellidos}`.trim(), historial: cambio ? `${hoy()} · ${cambio}\n${c.historial || ""}` : c.historial || "" };
    if (c.id) guardar(K.col, l.map(x => x.id === c.id ? reg : x)); else { reg.id = sig(l); l.push(reg); guardar(K.col, l); return reg.id; }
    return c.id;
  },
  async listReportes() { return leer(K.rep, []); },
  async listRespuestas() { return leer(K.res, []); },
  async createReporte(r) {
    const l = leer(K.rep, []); const id = sig(l);
    l.push({ ...r, id, estado: "Abierto", fijado: false, ultima: new Date().toISOString(), creado: new Date().toISOString() }); guardar(K.rep, l); return id;
  },
  async setEstado(id, estado) { guardar(K.rep, leer(K.rep, []).map(t => t.id === String(id) ? { ...t, estado, ultima: new Date().toISOString() } : t)); },
  async setFijado(id, v) { guardar(K.rep, leer(K.rep, []).map(t => t.id === String(id) ? { ...t, fijado: !!v } : t)); },
  async createRespuesta(r) {
    const l = leer(K.res, []); const id = sig(l);
    l.push({ ...r, id, oculta: false, creado: r.escrita }); guardar(K.res, l);
    guardar(K.rep, leer(K.rep, []).map(t => t.id === String(r.temaId) ? { ...t, ultima: new Date().toISOString() } : t)); return id;
  },
  async ocultarRespuesta(id) { guardar(K.res, leer(K.res, []).map(x => x.id === String(id) ? { ...x, oculta: true } : x)); },
  async subirFoto(d, blob, n) { await idbPut("fotos", `${d.fotoBase}-${n}`, blob); await idbPut("fotos", `idx:${d.fotoBase}-${n}`, d.fecha); },
  async fotosDelDia(fecha) {
    const m = new Map(); const ids = new Set();
    const fotosDe = [...leer(K.rep, []), ...leer(K.res, [])];
    for (const r of fotosDe) {
      const bases = new Set([r.fotoBase, ...(r.adjuntos || []).filter(a => a.t === "foto").map(a => a.base)].filter(Boolean));
      bases.forEach(b => ids.add(b));
    }
    for (const b of ids) {
      if (!b.startsWith(fecha.replaceAll("-", ""))) continue;
      for (let n = 1; n <= 40; n++) {
        const key = `${b}-${n}`; if (!(await idbGet("fotos", key))) continue;
        if (!m.has(b)) m.set(b, []); m.get(b).push({ n, id: key });
      }
    }
    return m;
  },
  async siguienteFoto(base, fecha) { const a = (await this.fotosDelDia(fecha)).get(base) || []; return Math.max(0, ...a.map(x => x.n)) + 1; },
  async fotoUrl(id) { if (!urls.has(id)) urls.set(id, URL.createObjectURL(await idbGet("fotos", id))); return urls.get(id); },
  async subirAdjunto(nombre, blob) { await idbPut("fotos", "adj:" + nombre, blob); return "adj:" + nombre; },
  async adjuntoUrl(id) { if (!urls.has(id)) urls.set(id, URL.createObjectURL(await idbGet("fotos", id))); return urls.get(id); }
};
