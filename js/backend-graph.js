// SharePoint vía Microsoft Graph. Reportes (=temas), respuestas y colaboradores = listas CQA_Foro_* / CQA_Colaboradores.
// Fotos = tu biblioteca CQA_Evidencias (con sus columnas). Videos y PDF = biblioteca CQA_Adjuntos.
import { cfg } from "./util.js";
import { token, sesion } from "./auth.js";

const G = "https://graph.microsoft.com/v1.0";
let siteId = null; const drives = {};
const cacheDia = new Map();   // fecha -> Map(fotoBase -> [{n,id}])
const cacheUrl = new Map();   // itemId -> blob URL

async function gfetch(path, opts = {}, scopes) {
  const t = await token(scopes);
  const r = await fetch(path.startsWith("http") ? path : G + path, {
    ...opts, headers: { Authorization: "Bearer " + t, Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly", ...(opts.headers || {}) }
  });
  if (r.status === 404 && opts.allow404) return null;
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg += ": " + (j.error?.message || ""); } catch { /* sin cuerpo */ }
    throw new Error(msg);
  }
  if (opts.raw) return r;
  if (r.status === 204) return null;
  return (r.headers.get("content-type") || "").includes("json") ? r.json() : r;
}
async function todas(path, opts) {
  let out = [], url = path;
  while (url) { const j = await gfetch(url, opts); if (!j) return out; out = out.concat(j.value); url = j["@odata.nextLink"]; }
  return out;
}
async function sitio() {
  if (!siteId) siteId = (await gfetch(`/sites/${cfg.sharepointHost}:${cfg.sitePath}?$select=id`)).id;
  return siteId;
}
async function unidad(nombre) {
  if (!drives[nombre]) drives[nombre] = (await gfetch(`/sites/${await sitio()}/lists/${encodeURIComponent(nombre)}/drive?$select=id`)).id;
  return drives[nombre];
}
const JSONH = { "Content-Type": "application/json" };
const L = n => encodeURIComponent(n);
const sumaDia = (f, n) => new Date(Date.parse(f + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const items = async (lista, extra = "") => todas(`/sites/${await sitio()}/lists/${L(lista)}/items?$expand=fields&$top=500${extra}`);
const crear = async (lista, fields) => (await gfetch(`/sites/${await sitio()}/lists/${L(lista)}/items`, { method: "POST", headers: JSONH, body: JSON.stringify({ fields }) })).id;
const parchar = async (lista, id, fields) => gfetch(`/sites/${await sitio()}/lists/${L(lista)}/items/${id}/fields`, { method: "PATCH", headers: JSONH, body: JSON.stringify(fields) });

const aReporte = it => { const f = it.fields; return {
  id: it.id, titulo: f.Title || "", area: f.Area || "", lugar: f.Lugar || "", fecha: f.Fecha || "", descripcion: f.Descripcion || "",
  tipo: f.Tipo || "Reporte", estado: f.Estado || "Abierto", fijado: !!f.Fijado, cargo: f.Cargo || "", empresa: f.Empresa || "",
  esp: f.Esp || "", autorEmail: (f.AutorEmail || "").toLowerCase(), fotoBase: f.FotoBase || "", nfotos: f.NFotos || 0,
  ultima: f.Ultima || it.lastModifiedDateTime, autorNombre: f.AutorNombre || it.createdBy?.user?.displayName || "", creado: it.createdDateTime }; };
const aRespuesta = it => { const f = it.fields; let adj = []; try { adj = JSON.parse(f.Adjuntos || "[]"); } catch { /* vacío */ }
  return { id: it.id, temaId: String(f.TemaId), kind: f.Kind || "Respuesta", texto: f.Texto || "", adjuntos: adj, oculta: !!f.Oculta,
    cargo: f.Cargo || "", empresa: f.Empresa || "", autorEmail: (f.AutorEmail || "").toLowerCase(),
    autorNombre: f.AutorNombre || it.createdBy?.user?.displayName || "", creado: f.FechaEscrita || it.createdDateTime }; };
const aColab = it => { const f = it.fields; return {
  id: it.id, email: (f.Title || "").toLowerCase(), nombres: f.Nombres || "", apellidos: f.Apellidos || "", dni: f.DNI || "", celular: f.Celular || "",
  cargo: f.Cargo || "", empresa: f.Empresa || "", empresaOtros: f.EmpresaOtros || "", areas: (f.Areas || "").split(";").filter(Boolean),
  grupo: f.Grupo || "", rol: f.Rol || "Colaborador", estado: f.Estado || "Activo", registrado: f.Registrado || (it.createdDateTime || "").slice(0, 10),
  historial: f.Historial || "", nombre: `${f.Nombres || ""} ${f.Apellidos || ""}`.trim() }; };
const deColab = c => ({ Title: c.email.toLowerCase(), Nombres: c.nombres, Apellidos: c.apellidos, DNI: c.dni, Celular: c.celular, Cargo: c.cargo,
  Empresa: c.empresa, EmpresaOtros: c.empresaOtros || "", Areas: c.areas.join(";"), Grupo: c.grupo || "", Rol: c.rol, Estado: c.estado,
  Registrado: c.registrado, Historial: c.historial || "" });

export const graph = {
  nombre: "SharePoint (CARAHUACRA)",
  async yo() { const s = sesion(); return { nombre: s?.name || s?.username || "", email: (s?.username || "").toLowerCase() }; },

  async listColaboradores() { return (await items(cfg.listaColaboradores)).map(aColab); },
  async saveColaborador(c, cambio) {
    const hist = c.historial || "";
    const campos = { ...deColab(c) };
    if (cambio) campos.Historial = `${new Date().toISOString().slice(0, 10)} · ${cambio}\n${hist}`.slice(0, 4000);
    if (c.id) { await parchar(cfg.listaColaboradores, c.id, campos); return c.id; }
    return crear(cfg.listaColaboradores, campos);
  },

  async listReportes() { return (await items(cfg.listaReportes)).map(aReporte); },
  async listRespuestas() { return (await items(cfg.listaRespuestas)).map(aRespuesta); },
  async createReporte(r) {
    return crear(cfg.listaReportes, { Title: r.titulo, Area: r.area, Lugar: r.lugar || "", Fecha: r.fecha, Descripcion: r.descripcion || "",
      Tipo: r.tipo || "Reporte", Estado: "Abierto", Fijado: false, Cargo: r.cargo, Empresa: r.empresa, Esp: r.esp || "", AutorEmail: r.autorEmail,
      AutorNombre: r.autorNombre, FotoBase: r.fotoBase || "", NFotos: r.nfotos || 0, Ultima: new Date().toISOString() });
  },
  async setEstado(id, estado) { await parchar(cfg.listaReportes, id, { Estado: estado, Ultima: new Date().toISOString() }); },
  async setFijado(id, v) { await parchar(cfg.listaReportes, id, { Fijado: !!v }); },
  async createRespuesta(r) {
    const id = await crear(cfg.listaRespuestas, { Title: (r.texto || r.kind).slice(0, 60), TemaId: Number(r.temaId), Kind: r.kind, Texto: r.texto || "",
      Adjuntos: JSON.stringify(r.adjuntos || []), Oculta: false, Cargo: r.cargo, Empresa: r.empresa, AutorEmail: r.autorEmail,
      AutorNombre: r.autorNombre, FechaEscrita: r.escrita });
    await parchar(cfg.listaReportes, r.temaId, { Ultima: new Date().toISOString() });
    return id;
  },
  async ocultarRespuesta(id) { await parchar(cfg.listaRespuestas, id, { Oculta: true }); },

  // Sube la foto a CQA_Evidencias y completa sus columnas. El nombre es fijo, así que reintentar no duplica.
  async subirFoto(d, blob, n) {
    const fotoId = `${d.fotoBase}-${n}`, u = await unidad(cfg.bibliotecaEvidencias);
    const file = await gfetch(`/drives/${u}/root:/${fotoId}.jpg:/content`, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
    await gfetch(`/drives/${u}/items/${file.id}/listItem/fields`, { method: "PATCH", headers: JSONH, body: JSON.stringify({
      FotoID: fotoId, FechaTrabajo: `${d.fecha}T12:00:00Z`, FrenteCodigo: d.area,
      ...(d.esp ? { AreaCodigo: d.esp } : {}), DescripcionCampo: d.texto || "", EstadoEvidencia: cfg.estadoInicial }) });
    cacheDia.delete(d.fecha);
  },
  async fotosDelDia(fecha, fresco) {
    if (fresco) cacheDia.delete(fecha);
    if (cacheDia.has(fecha)) return cacheDia.get(fecha);
    const q = `fields/FechaTrabajo ge '${fecha}T00:00:00Z' and fields/FechaTrabajo lt '${sumaDia(fecha, 1)}T00:00:00Z'`;
    const its = await todas(`/sites/${await sitio()}/lists/${L(cfg.bibliotecaEvidencias)}/items?$expand=fields($select=FotoID),driveItem($select=id)&$top=200&$filter=${encodeURIComponent(q)}`);
    const m = new Map();
    for (const it of its) {
      const k = /^(\d{8}-.+)-(\d+)$/.exec(it.fields?.FotoID || "");
      if (!k || !it.driveItem?.id) continue;
      if (!m.has(k[1])) m.set(k[1], []);
      m.get(k[1]).push({ n: Number(k[2]), id: it.driveItem.id });
    }
    m.forEach(a => a.sort((x, y) => x.n - y.n));
    cacheDia.set(fecha, m); return m;
  },
  async siguienteFoto(base, fecha) { const a = (await this.fotosDelDia(fecha, true)).get(base) || []; return Math.max(0, ...a.map(x => x.n)) + 1; },
  async fotoUrl(id) {
    if (cacheUrl.has(id)) return cacheUrl.get(id);
    const r = await gfetch(`/drives/${await unidad(cfg.bibliotecaEvidencias)}/items/${id}/content`, { raw: true });
    const u = URL.createObjectURL(await r.blob()); cacheUrl.set(id, u); return u;
  },
  // Video o PDF de una respuesta → CQA_Adjuntos
  async subirAdjunto(nombre, blob) {
    const u = await unidad(cfg.bibliotecaAdjuntos);
    const f = await gfetch(`/drives/${u}/root:/${encodeURIComponent(nombre)}:/content`, { method: "PUT", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    return f.id;
  },
  async adjuntoUrl(id) {
    if (cacheUrl.has("a" + id)) return cacheUrl.get("a" + id);
    const r = await gfetch(`/drives/${await unidad(cfg.bibliotecaAdjuntos)}/items/${id}/content`, { raw: true });
    const u = URL.createObjectURL(await r.blob()); cacheUrl.set("a" + id, u); return u;
  },

  // Solo administrador: crea (o completa) las listas y la biblioteca de adjuntos. CQA_Evidencias no se toca.
  async prepararSitio(log) {
    const S = ["Sites.Manage.All"];
    const id = (await gfetch(`/sites/${cfg.sharepointHost}:${cfg.sitePath}?$select=id`, {}, S)).id;
    const existentes = (await gfetch(`/sites/${id}/lists?$select=id,displayName`, {}, S)).value;
    const nota = { allowMultipleLines: true, textType: "plain" };
    const T = n => ({ name: n, text: {} }), N = n => ({ name: n, number: {} }), B = n => ({ name: n, boolean: {} }), M = n => ({ name: n, text: nota });
    const defs = [
      { displayName: cfg.listaReportes, list: { template: "genericList" }, columns: [T("Area"), T("Lugar"), T("Fecha"), M("Descripcion"), T("Tipo"), T("Estado"),
        B("Fijado"), T("Cargo"), T("Empresa"), T("Esp"), T("AutorEmail"), T("AutorNombre"), T("FotoBase"), N("NFotos"), T("Ultima")] },
      { displayName: cfg.listaRespuestas, list: { template: "genericList" }, columns: [N("TemaId"), T("Kind"), M("Texto"), M("Adjuntos"), B("Oculta"),
        T("Cargo"), T("Empresa"), T("AutorEmail"), T("AutorNombre"), T("FechaEscrita")] },
      { displayName: cfg.listaColaboradores, list: { template: "genericList" }, columns: [T("Nombres"), T("Apellidos"), T("DNI"), T("Celular"), T("Cargo"),
        T("Empresa"), T("EmpresaOtros"), T("Areas"), T("Grupo"), T("Rol"), T("Estado"), T("Registrado"), M("Historial")] },
      { displayName: cfg.bibliotecaAdjuntos, list: { template: "documentLibrary" }, columns: [] }
    ];
    for (const d of defs) {
      const ya = existentes.find(l => l.displayName === d.displayName);
      if (!ya) { await gfetch(`/sites/${id}/lists`, { method: "POST", headers: JSONH, body: JSON.stringify(d) }, S); log(`✔ ${d.displayName} creada`); continue; }
      const tiene = (await gfetch(`/sites/${id}/lists/${ya.id}/columns?$select=name`, {}, S)).value.map(c => c.name);
      let nuevas = 0;
      for (const c of d.columns.filter(c => !tiene.includes(c.name))) {
        await gfetch(`/sites/${id}/lists/${ya.id}/columns`, { method: "POST", headers: JSONH, body: JSON.stringify(c) }, S); nuevas++;
      }
      log(`✔ ${d.displayName} ya existe${nuevas ? ` (+${nuevas} columnas)` : ""}`);
    }
    log(`✔ ${cfg.bibliotecaEvidencias}: se usa tal como está (no se modifica)`);
    log(`ℹ En ${cfg.bibliotecaEvidencias}, la columna FrenteCodigo debe aceptar los códigos GAV, TOL, RUM, ESC, CDS y OTR.`);
  }
};
