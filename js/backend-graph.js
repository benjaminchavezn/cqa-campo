// Foro (temas y reportes) = listas nuevas de SharePoint. Fotos = tu biblioteca CQA_Evidencias, con sus columnas.
import { cfg } from "./util.js";
import { token, sesion } from "./auth.js";

const G = "https://graph.microsoft.com/v1.0";
let siteId = null, driveId = null;
const cacheDia = new Map();   // fecha -> Map(fotoBase -> [{n,id}])
const cacheUrl = new Map();   // itemId -> blob URL

async function gfetch(path, opts = {}, scopes) {
  const t = await token(scopes);
  const r = await fetch(path.startsWith("http") ? path : G + path, {
    ...opts,
    headers: { Authorization: "Bearer " + t, Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly", ...(opts.headers || {}) }
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
async function todas(path) {
  let out = [], url = path;
  while (url) { const j = await gfetch(url); out = out.concat(j.value); url = j["@odata.nextLink"]; }
  return out;
}
async function sitio() {
  if (!siteId) siteId = (await gfetch(`/sites/${cfg.sharepointHost}:${cfg.sitePath}?$select=id`)).id;
  return siteId;
}
async function unidad() {
  if (!driveId) driveId = (await gfetch(`/sites/${await sitio()}/lists/${encodeURIComponent(cfg.bibliotecaEvidencias)}/drive?$select=id`)).id;
  return driveId;
}
const JSONH = { "Content-Type": "application/json" };
const lista = n => encodeURIComponent(n);
const sumaDia = (f, n) => new Date(Date.parse(f + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

const aTema = it => ({
  id: it.id, titulo: it.fields.Title, area: it.fields.Area || "", frente: it.fields.Frente || "",
  estado: it.fields.Estado || "Abierto", descripcion: it.fields.Descripcion || "",
  autor: it.createdBy?.user?.displayName || "", creado: it.createdDateTime
});
const aReporte = it => ({
  id: it.id, temaId: String(it.fields.TemaId), fecha: it.fields.Fecha, area: it.fields.Area || "",
  frente: it.fields.Frente || "", tipo: it.fields.Tipo || "Reporte diario", texto: it.fields.Texto || "",
  nfotos: it.fields.NFotos || 0, fotoBase: it.fields.FotoBase || "",
  autor: it.createdBy?.user?.displayName || "", creado: it.createdDateTime
});

export const graph = {
  nombre: "SharePoint (CARAHUACRA)",
  async yo() { return sesion()?.name || sesion()?.username || ""; },

  async listTemas() {
    return (await todas(`/sites/${await sitio()}/lists/${lista(cfg.listaTemas)}/items?$expand=fields&$top=200`)).map(aTema);
  },
  async createTema(t) {
    const it = await gfetch(`/sites/${await sitio()}/lists/${lista(cfg.listaTemas)}/items`, {
      method: "POST", headers: JSONH,
      body: JSON.stringify({ fields: { Title: t.titulo, Area: t.area || "", Frente: t.frente || "", Estado: "Abierto", Descripcion: t.descripcion } })
    });
    return it.id;
  },
  async cerrarTema(id, estado) {
    await gfetch(`/sites/${await sitio()}/lists/${lista(cfg.listaTemas)}/items/${id}/fields`, {
      method: "PATCH", headers: JSONH, body: JSON.stringify({ Estado: estado })
    });
  },
  async listReportes({ temaId, fecha } = {}) {
    const f = [];
    if (temaId) f.push(`fields/TemaId eq ${Number(temaId)}`);
    if (fecha) f.push(`fields/Fecha eq '${fecha}'`);
    const q = `?$expand=fields&$top=200${f.length ? "&$filter=" + encodeURIComponent(f.join(" and ")) : ""}`;
    return (await todas(`/sites/${await sitio()}/lists/${lista(cfg.listaReportes)}/items${q}`)).map(aReporte);
  },
  async createReporte(r) {
    const it = await gfetch(`/sites/${await sitio()}/lists/${lista(cfg.listaReportes)}/items`, {
      method: "POST", headers: JSONH,
      body: JSON.stringify({ fields: {
        Title: (r.texto || "").slice(0, 60) || r.tipo, TemaId: Number(r.temaId), Fecha: r.fecha, Area: r.area || "",
        Frente: r.frente || "", Tipo: r.tipo, Texto: r.texto, NFotos: r.nfotos || 0, FotoBase: r.fotoBase || ""
      } })
    });
    return it.id;
  },

  // Sube la foto a CQA_Evidencias y completa sus columnas. El nombre es fijo, así que reintentar no duplica.
  async subirFoto(datos, blob, n) {
    const fotoId = `${datos.fotoBase}-${n}`;
    const d = await unidad();
    const file = await gfetch(`/drives/${d}/root:/${fotoId}.jpg:/content`, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: blob });
    await gfetch(`/drives/${d}/items/${file.id}/listItem/fields`, {
      method: "PATCH", headers: JSONH,
      body: JSON.stringify({
        FotoID: fotoId, FechaTrabajo: `${datos.fecha}T12:00:00Z`,
        ...(datos.frente ? { FrenteCodigo: datos.frente } : {}), ...(datos.area ? { AreaCodigo: datos.area } : {}),
        DescripcionCampo: datos.texto || "", EstadoEvidencia: cfg.estadoInicial
      })
    });
    cacheDia.delete(datos.fecha);
  },
  // Fotos de un día, agrupadas por reporte: Map(fotoBase -> [{n, id}])
  async fotosDelDia(fecha) {
    if (cacheDia.has(fecha)) return cacheDia.get(fecha);
    const q = `fields/FechaTrabajo ge '${fecha}T00:00:00Z' and fields/FechaTrabajo lt '${sumaDia(fecha, 1)}T00:00:00Z'`;
    const items = await todas(`/sites/${await sitio()}/lists/${lista(cfg.bibliotecaEvidencias)}/items?$expand=fields($select=FotoID),driveItem($select=id)&$top=200&$filter=${encodeURIComponent(q)}`);
    const m = new Map();
    for (const it of items) {
      const k = /^(\d{8}-.+)-(\d+)$/.exec(it.fields?.FotoID || "");
      if (!k || !it.driveItem?.id) continue;
      if (!m.has(k[1])) m.set(k[1], []);
      m.get(k[1]).push({ n: Number(k[2]), id: it.driveItem.id });
    }
    m.forEach(a => a.sort((x, y) => x.n - y.n));
    cacheDia.set(fecha, m);
    return m;
  },
  // Descarga la foto con la sesión y devuelve una URL local para mostrarla.
  async fotoUrl(itemId) {
    if (cacheUrl.has(itemId)) return cacheUrl.get(itemId);
    const r = await gfetch(`/drives/${await unidad()}/items/${itemId}/content`, { raw: true });
    const u = URL.createObjectURL(await r.blob());
    cacheUrl.set(itemId, u); return u;
  },

  // Solo administrador: crea las dos listas del foro (idempotente). CQA_Evidencias ya existe y no se toca.
  async prepararSitio(log) {
    const S = ["Sites.Manage.All"];
    const id = (await gfetch(`/sites/${cfg.sharepointHost}:${cfg.sitePath}?$select=id`, {}, S)).id;
    const existentes = (await gfetch(`/sites/${id}/lists?$select=displayName`, {}, S)).value.map(l => l.displayName);
    const nota = { allowMultipleLines: true, textType: "plain" };
    const nuevas = [
      { displayName: cfg.listaTemas, list: { template: "genericList" }, columns: [
        { name: "Area", text: {} }, { name: "Frente", text: {} },
        { name: "Estado", choice: { choices: ["Abierto", "Cerrado"], displayAs: "dropDownMenu" } },
        { name: "Descripcion", text: nota } ] },
      { displayName: cfg.listaReportes, list: { template: "genericList" }, columns: [
        { name: "TemaId", number: {} }, { name: "Fecha", text: {} }, { name: "Area", text: {} }, { name: "Frente", text: {} },
        { name: "Tipo", choice: { choices: ["Reporte diario", "Comentario"], displayAs: "dropDownMenu" } },
        { name: "Texto", text: nota }, { name: "NFotos", number: {} }, { name: "FotoBase", text: {} } ] }
    ];
    for (const l of nuevas) {
      if (existentes.includes(l.displayName)) { log(`✔ ${l.displayName} ya existe`); continue; }
      await gfetch(`/sites/${id}/lists`, { method: "POST", headers: JSONH, body: JSON.stringify(l) }, S);
      log(`✔ ${l.displayName} creada`);
    }
    log(`✔ ${cfg.bibliotecaEvidencias}: se usa tal como está (no se modifica)`);
  }
};
