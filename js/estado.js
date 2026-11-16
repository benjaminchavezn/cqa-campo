// Estado compartido, permisos, lectura de datos y cola de envío (funciona sin señal).
import { DEMO } from "./util.js";
import { AREAS, SUPERVISAN } from "./catalogos.js";
import { idbPut, idbDel, idbAll } from "./idb.js";
import { graph } from "./backend-graph.js";
import { demo } from "./backend-demo.js";

export const B = DEMO ? demo : graph;
export const S = { yo: { nombre: "", email: "" }, perfil: null, colabs: [], temas: [], resps: [], pend: [], cargado: false, errorColabs: "", borrador: null };
export const hooks = { repintar() {}, toast() {}, estado() {} };
const OUT = "outbox";

/* ---- permisos (en la app; el control real del sitio lo da SharePoint) ---- */
export const esAdmin = () => S.perfil?.rol === "Administrador";
export const supervisa = () => esAdmin() || S.perfil?.rol === "Supervisor" || SUPERVISAN.includes(S.perfil?.cargo);
export const veTodas = () => esAdmin() || S.perfil?.cargo === "Jefe de servicio";
export const activo = () => S.perfil?.estado === "Activo";
export const misAreas = () => veTodas() ? AREAS.map(a => a.codigo) : (S.perfil?.areas || []);
export const puedeVer = t => misAreas().includes(t.area) || (t.area === "OTR" && supervisa());
export const soyYo = email => !!email && email === S.yo.email;

/* ---- datos ---- */
export async function cargar(forzar = false) {
  if (S.cargado && !forzar) return;
  const [temas, resps] = await Promise.all([B.listReportes(), B.listRespuestas()]);
  S.temas = temas; S.resps = resps;
  try { S.colabs = await B.listColaboradores(); S.errorColabs = ""; } catch (e) { S.colabs = []; S.errorColabs = e.message; }
  S.perfil = S.colabs.find(c => c.email === S.yo.email) || null;
  S.cargado = true;
}
export const respDe = id => S.resps.filter(r => r.temaId === String(id) && !r.oculta).sort((a, b) => a.creado.localeCompare(b.creado));
export const actividad = t => respDe(t.id).reduce((m, r) => r.creado > m ? r.creado : m, t.ultima || t.creado);
export const colabDe = email => S.colabs.find(c => c.email === email);
export const nombreDe = (email, resp) => colabDe(email)?.nombre || resp || "—";

const LEIDO = "cqa_leido";
const leidos = () => { try { return JSON.parse(localStorage.getItem(LEIDO)) || {}; } catch { return {}; } };
export function marcarLeido(id) { try { const l = leidos(); l[id] = new Date().toISOString(); localStorage.setItem(LEIDO, JSON.stringify(l)); } catch { /* sin almacenamiento */ } }
export function noLeido(t) {
  const rs = respDe(t.id), ultimo = rs[rs.length - 1], actor = ultimo ? ultimo.autorEmail : t.autorEmail;
  if (soyYo(actor)) return false;
  const v = leidos()[t.id]; return !v || v < actividad(t);
}
export const hayNovedades = () => S.temas.filter(puedeVer).some(noLeido);

/* ---- cola de envío ---- */
export async function leerPend() {
  S.pend = (await idbAll(OUT)).map(x => x.value).sort((a, b) => a.creado.localeCompare(b.creado)); hooks.estado();
}
export async function encolar(kind, data, fotos = [], adjuntos = []) {
  const key = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
  await idbPut(OUT, key, { key, kind, data, fotos, adjuntos, subidas: 0, adjSubidos: [], itemId: null, n0: 0, creado: new Date().toISOString() });
  await leerPend(); void vaciarCola();
}
export async function descartar(key) { await idbDel(OUT, key); await leerPend(); }
export const reintentar = async key => { const it = S.pend.find(p => p.key === key); if (it) { delete it.error; await idbPut(OUT, key, it); } void vaciarCola(); };
let enviando = false;
export async function vaciarCola() {
  if (enviando || !navigator.onLine) return;
  enviando = true; let ok = 0;
  try {
    await leerPend();
    for (const it of [...S.pend]) {
      try {
        const d = it.data, guardar = () => idbPut(OUT, it.key, it);
        if (it.kind === "reporte") {
          while (it.subidas < it.fotos.length) {
            await B.subirFoto({ fotoBase: d.fotoBase, fecha: d.fecha, area: d.area, esp: d.esp, texto: d.descripcion || d.titulo }, it.fotos[it.subidas], it.subidas + 1);
            it.subidas++; await guardar();
          }
          if (!it.itemId) { it.itemId = await B.createReporte({ ...d, nfotos: it.fotos.length }); await guardar(); }
        } else {
          if (it.fotos.length && !it.n0) { it.n0 = d.baseNueva ? 1 : await B.siguienteFoto(d.fotoBase, d.temaFecha); await guardar(); }
          while (it.subidas < it.fotos.length) {
            await B.subirFoto({ fotoBase: d.fotoBase, fecha: d.temaFecha, area: d.area, esp: d.esp, texto: d.texto }, it.fotos[it.subidas], it.n0 + it.subidas);
            it.subidas++; await guardar();
          }
          while (it.adjSubidos.length < it.adjuntos.length) {
            const a = it.adjuntos[it.adjSubidos.length];
            const id = await B.subirAdjunto(`${it.key.slice(0, 8)}-${a.nombre}`, a.blob);
            it.adjSubidos.push({ t: a.t, id, nombre: a.nombre }); await guardar();
          }
          if (!it.itemId) {
            const adj = [...it.fotos.map((_, i) => ({ t: "foto", base: d.fotoBase, n: it.n0 + i })), ...it.adjSubidos, ...(d.enlace ? [{ t: "enlace", url: d.enlace }] : [])];
            it.itemId = await B.createRespuesta({ temaId: d.temaId, kind: d.kind, texto: d.texto, adjuntos: adj, cargo: d.cargo, empresa: d.empresa,
              autorEmail: d.autorEmail, autorNombre: d.autorNombre, escrita: it.creado }); await guardar();
          }
          if (d.estadoNuevo && !it.estadoOk) { await B.setEstado(d.temaId, d.estadoNuevo); it.estadoOk = true; await guardar(); }
        }
        await idbDel(OUT, it.key); ok++;
      } catch (e) { it.error = e.message; await idbPut(OUT, it.key, it); hooks.toast("No se pudo enviar: " + e.message, 6000); break; }
    }
  } finally {
    enviando = false; await leerPend();
    if (ok) { hooks.toast(ok === 1 ? "Enviado ✔" : `${ok} envíos completados ✔`); await cargar(true); hooks.repintar(); }
  }
}
addEventListener("online", () => { hooks.estado(); void vaciarCola(); });
addEventListener("offline", () => hooks.estado());
