import { cfg, DEMO, h, hoy, diaLargo, hora, haceCuanto, iniciales, reducirFoto, nomFrente, nomArea, opAreas, opFrentes, nuevaBase } from "./util.js";
import { idbPut, idbDel, idbAll } from "./idb.js";
import { initAuth, sesion, entrar, salir } from "./auth.js";
import { graph } from "./backend-graph.js";
import { demo } from "./backend-demo.js";

const B = DEMO ? demo : graph;
const $app = document.getElementById("app");
const montar = (...n) => $app.replaceChildren(...n.flat(Infinity).filter(Boolean));
const $top = document.getElementById("top-title");
const $pill = document.getElementById("pill");
const state = { yo: "", temas: [], reps: [], pendientes: [], cargado: false, filtro: "Abierto", busca: "" };
const OUT = "outbox";

/* ---------- utilidades de interfaz ---------- */
function toast(msg, ms = 3500) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t); setTimeout(() => t.remove(), ms);
}
function lightbox(url) {
  const o = h("div", { class: "lightbox", onclick: () => o.remove() }, h("img", { src: url, alt: "Foto ampliada" }));
  document.body.append(o);
}
const etiqueta = (t, c = "") => t ? h("span", { class: "tag " + c }, t) : null;
function vacio(icono, titulo, texto, ...acciones) {
  return h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icono), h("h3", null, titulo), h("p", null, texto), ...acciones);
}
function cargando(texto = "Cargando…") { return h("div", { class: "loading" }, h("div", { class: "spin" }), texto); }

/* ---------- cola de envío (funciona sin señal) ---------- */
let enviando = false;
async function leerPendientes() {
  state.pendientes = (await idbAll(OUT)).map(x => x.value).sort((a, b) => a.creado.localeCompare(b.creado));
  pintarPill();
}
async function encolar(data, fotos) {
  const key = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
  await idbPut(OUT, key, { key, data, fotos, itemId: null, subidas: 0, creado: new Date().toISOString() });
  await leerPendientes();
  void vaciarCola();
}
async function vaciarCola() {
  if (enviando || !navigator.onLine) return;
  enviando = true; let ok = 0;
  try {
    await leerPendientes();
    for (const it of [...state.pendientes]) {
      try {
        if (!it.itemId) { it.itemId = await B.createReporte({ ...it.data, nfotos: it.fotos.length }); await idbPut(OUT, it.key, it); }
        while (it.subidas < it.fotos.length) {
          await B.subirFoto(it.data, it.fotos[it.subidas], it.subidas + 1);
          it.subidas++; await idbPut(OUT, it.key, it);
        }
        await idbDel(OUT, it.key); ok++;
      } catch (e) {
        it.error = e.message; await idbPut(OUT, it.key, it);
        toast("No se pudo enviar: " + e.message, 6000); break;
      }
    }
  } finally {
    enviando = false; await leerPendientes();
    if (ok) { toast(ok === 1 ? "Reporte enviado ✔" : `${ok} reportes enviados ✔`); await cargarDatos(true); route(); }
  }
}
function pintarPill() {
  const n = state.pendientes.length;
  $pill.className = "pill " + (!navigator.onLine ? "off" : n ? "wait" : "ok");
  $pill.textContent = !navigator.onLine ? (n ? `Sin señal · ${n} por enviar` : "Sin señal") : n ? `${n} por enviar` : (DEMO ? "Demo" : "En línea");
  $pill.onclick = () => { if (n) void vaciarCola(); };
}
addEventListener("online", () => { pintarPill(); void vaciarCola(); });
addEventListener("offline", pintarPill);

/* ---------- datos ---------- */
async function cargarDatos(forzar = false) {
  if (state.cargado && !forzar) return;
  const [temas, reps] = await Promise.all([B.listTemas(), B.listReportes()]);
  state.temas = temas; state.reps = reps; state.cargado = true;
}
const repsDe = id => state.reps.filter(r => r.temaId === String(id));

/* ---------- pantalla: temas ---------- */
async function vistaTemas() {
  $top.textContent = "Temas";
  const lista = h("div", { class: "list" });
  const buscador = h("input", { type: "search", placeholder: "Buscar tema…", value: state.busca, "aria-label": "Buscar tema",
    oninput: e => { state.busca = e.target.value; pintar(); } });
  const chips = h("div", { class: "chips" }, ["Abierto", "Todos"].map(f =>
    h("button", { class: "chip" + (state.filtro === f ? " on" : ""), onclick: () => { state.filtro = f; vistaTemas(); } }, f === "Abierto" ? "Abiertos" : "Todos")));
  montar(h("div", { class: "toolbar" }, buscador, chips), lista,
    h("button", { class: "fab", "aria-label": "Nuevo tema", onclick: () => formTema() }, "+ Nuevo tema"));
  function pintar() {
    const q = state.busca.toLowerCase();
    const items = state.temas
      .filter(t => (state.filtro === "Todos" || t.estado !== "Cerrado") && (!q || (t.titulo + t.frente + t.area).toLowerCase().includes(q)))
      .map(t => ({ t, rs: repsDe(t.id) }))
      .map(x => ({ ...x, ult: x.rs.reduce((m, r) => r.creado > m ? r.creado : m, x.t.creado) }))
      .sort((a, b) => b.ult.localeCompare(a.ult));
    lista.replaceChildren(...(items.length ? items.map(({ t, rs, ult }) => {
      const reciente = rs.slice().sort((a, b) => b.creado.localeCompare(a.creado))[0];
      return h("a", { class: "card topic", href: `#tema-${t.id}` },
        h("div", { class: "row" }, h("h3", null, t.titulo), t.estado === "Cerrado" ? etiqueta("Cerrado", "grey") : null),
        h("div", { class: "tags" }, etiqueta(nomArea(t.area), "teal"), etiqueta(nomFrente(t.frente))),
        h("div", { class: "meta" }, `${rs.length} ${rs.length === 1 ? "reporte" : "reportes"}`,
          reciente ? ` · ${reciente.autor.split(" ")[0] || "—"} ${haceCuanto(ult)}` : " · sin reportes aún"));
    }) : [vacio("💬", "Aún no hay temas", "Crea el primero: cada tema agrupa los reportes de una actividad, frente o ensayo.")]));
  }
  if (!state.cargado) { lista.append(cargando()); await cargarDatos(); }
  pintar();
}

/* ---------- pantalla: un tema ---------- */
async function vistaTema(id) {
  const t0 = state.temas.find(t => t.id === String(id));
  $top.textContent = t0 ? "Tema" : "…";
  montar(cargando());
  await cargarDatos();
  const t = state.temas.find(x => x.id === String(id));
  if (!t) { montar(vacio("🔎", "Tema no encontrado", "Puede que lo hayan eliminado.", h("a", { class: "btn", href: "#temas" }, "Volver"))); return; }
  const propios = state.pendientes.filter(p => p.data.temaId === String(id)).map(p => ({
    id: "p" + p.key, temaId: p.data.temaId, fecha: p.data.fecha, area: p.data.area, frente: p.data.frente, tipo: p.data.tipo,
    texto: p.data.texto, autor: state.yo, creado: p.creado, pendiente: p, nfotos: p.fotos.length, fotoBase: p.data.fotoBase }));
  const todos = [...repsDe(id), ...propios];
  const dias = [...new Set(todos.map(r => r.fecha))].sort().reverse();
  const feed = h("div", { class: "feed" });
  for (const d of dias) {
    feed.append(h("div", { class: "day" }, diaLargo(d), h("small", null, d)));
    const delDia = todos.filter(r => r.fecha === d).sort((a, b) => a.creado.localeCompare(b.creado));
    feed.append(...delDia.map(r => post(r)));
  }
  if (!dias.length) feed.append(vacio("📝", "Sin reportes todavía", "Sé el primero en reportar en este tema."));
  montar(
    h("a", { class: "back", href: "#temas" }, "‹ Temas"),
    h("div", { class: "thread-head" }, h("h2", null, t.titulo),
      h("div", { class: "tags" }, etiqueta(nomArea(t.area), "teal"), etiqueta(nomFrente(t.frente)), t.estado === "Cerrado" ? etiqueta("Cerrado", "grey") : null),
      t.descripcion ? h("p", { class: "meta" }, t.descripcion) : null,
      h("button", { class: "link", onclick: async () => {
        try { await B.cerrarTema(t.id, t.estado === "Cerrado" ? "Abierto" : "Cerrado"); await cargarDatos(true); vistaTema(id); } catch (e) { toast(e.message); }
      } }, t.estado === "Cerrado" ? "Reabrir tema" : "Cerrar tema")),
    feed,
    h("div", { class: "compose-bar" }, h("button", { class: "btn primary big", onclick: () => formReporte({ temaId: String(id), t }) }, "✎ Escribir reporte")));
}

function post(r) {
  const fotos = h("div", { class: "photos" });
  const card = h("article", { class: "post" + (r.pendiente ? " pending" : "") },
    h("div", { class: "avatar", "aria-hidden": "true" }, iniciales(r.autor)),
    h("div", { class: "body" },
      h("div", { class: "who" }, h("strong", null, r.autor || "—"), h("span", { class: "meta" }, hora(r.creado)),
        r.pendiente ? etiqueta(r.pendiente.error ? "Error: toca para reintentar" : "Pendiente de envío", "amber") : null),
      h("div", { class: "tags" }, etiqueta(r.tipo, r.tipo === "Comentario" ? "grey" : "teal"), etiqueta(nomArea(r.area)), etiqueta(nomFrente(r.frente))),
      h("p", { class: "text" }, r.texto), fotos));
  if (r.pendiente) {
    r.pendiente.fotos.forEach(b => { const u = URL.createObjectURL(b); fotos.append(h("img", { src: u, alt: "Foto por enviar", onclick: () => lightbox(u) })); });
    if (r.pendiente.error) card.onclick = () => { delete r.pendiente.error; void vaciarCola(); };
  } else if (r.nfotos && r.fotoBase) {
    fotos.append(h("div", { class: "ph" }, "Cargando fotos…"));
    B.fotosDelDia(r.fecha).then(async m => {
      const fs = m.get(r.fotoBase) || [];
      if (!fs.length) { fotos.replaceChildren(h("div", { class: "ph" }, "Fotos aún no disponibles")); return; }
      fotos.replaceChildren();
      for (const f of fs) {
        const u = await B.fotoUrl(f.id);
        fotos.append(h("img", { src: u, loading: "lazy", alt: `Foto ${f.n}`, onclick: () => lightbox(u) }));
      }
    }).catch(() => fotos.replaceChildren(h("div", { class: "ph" }, "No se pudieron cargar las fotos")));
  }
  return card;
}

/* ---------- pantalla: hoy ---------- */
async function vistaHoy() {
  $top.textContent = "Hoy";
  montar(cargando());
  await cargarDatos();
  const f = hoy();
  const lista = state.reps.filter(r => r.fecha === f && r.tipo !== "Comentario").sort((a, b) => b.creado.localeCompare(a.creado));
  const autores = new Set(lista.map(r => r.autor.toLowerCase()));
  const faltan = cfg.equipo.filter(n => !autores.has(n.toLowerCase()));
  montar(
    h("div", { class: "today-head" }, h("div", { class: "big-num" }, String(lista.length)),
      h("div", null, h("strong", null, lista.length === 1 ? "reporte diario hoy" : "reportes diarios hoy"), h("div", { class: "meta" }, diaLargo(f) + " · " + f))),
    faltan.length ? h("div", { class: "card warn" }, h("strong", null, "Faltan por reportar"), h("p", null, faltan.join(", "))) : null,
    h("button", { class: "btn primary big", onclick: () => formReporte({}) }, "✎ Nuevo reporte de hoy"),
    h("div", { class: "list" }, lista.length ? lista.map(r => {
      const t = state.temas.find(x => x.id === r.temaId);
      return h("a", { class: "card", href: `#tema-${r.temaId}` },
        h("div", { class: "row" }, h("strong", null, r.autor), h("span", { class: "meta" }, hora(r.creado))),
        h("div", { class: "tags" }, etiqueta(nomArea(r.area), "teal"), etiqueta(nomFrente(r.frente)), etiqueta(t ? t.titulo : "", "grey")),
        h("p", { class: "text clamp" }, r.texto));
    }) : [vacio("🌤", "Nadie ha reportado hoy", "Cuando llegue el primero aparecerá aquí.")]));
}

/* ---------- pantalla: más ---------- */
async function vistaMas() {
  $top.textContent = "Más";
  await leerPendientes();
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  const log = h("pre", { class: "log", hidden: true });
  montar(
    h("div", { class: "card" }, h("h3", null, "Cuenta"), h("p", null, state.yo || "—"),
      h("p", { class: "meta" }, "Guardando en: " + B.nombre),
      !DEMO ? h("button", { class: "btn", onclick: () => salir() }, "Cerrar sesión") : null),
    h("div", { class: "card" }, h("h3", null, "Envíos pendientes"),
      h("p", null, state.pendientes.length ? `${state.pendientes.length} reporte(s) esperando señal.` : "No hay nada pendiente."),
      state.pendientes.length ? h("button", { class: "btn", onclick: () => vaciarCola() }, "Enviar ahora") : null),
    h("div", { class: "card" }, h("h3", null, "Instalar como app"),
      h("p", null, ios ? "En iPhone abre esta página en Safari → botón Compartir → «Añadir a pantalla de inicio»."
        : "En Android abre esta página en Chrome → menú ⋮ → «Instalar aplicación» (o «Añadir a pantalla de inicio»).")),
    !DEMO ? h("div", { class: "card" }, h("h3", null, "Administrador"),
      h("p", { class: "meta" }, "Solo la primera vez: crea en SharePoint las listas y la biblioteca de fotos."),
      h("button", { class: "btn", onclick: async () => {
        log.hidden = false; log.textContent = "Preparando…\n";
        try { await graph.prepararSitio(m => log.textContent += m + "\n"); log.textContent += "Listo."; }
        catch (e) { log.textContent += "✖ " + e.message; }
      } }, "Preparar sitio de SharePoint"), log) : null,
    h("p", { class: "meta center" }, "CQA Campo · v1.0"));
}

/* ---------- formularios ---------- */
function hoja(titulo, contenido) {
  const cerrar = () => { fondo.remove(); };
  const fondo = h("div", { class: "sheet-bg", onclick: e => { if (e.target === fondo) cerrar(); } },
    h("div", { class: "sheet", role: "dialog", "aria-label": titulo },
      h("div", { class: "sheet-head" }, h("h2", null, titulo), h("button", { class: "x", "aria-label": "Cerrar", onclick: cerrar }, "✕")),
      contenido));
  document.body.append(fondo);
  return cerrar;
}
const sel = (id, opciones, valor, vacioTxt) => h("select", { id },
  vacioTxt ? h("option", { value: "" }, vacioTxt) : null,
  opciones.map(o => h("option", { value: o.v ?? o, selected: (o.v ?? o) === valor }, o.t ?? o)));
const recordar = (k, v) => { try { return v ? localStorage.setItem("cqa_" + k, v) : localStorage.getItem("cqa_" + k) || ""; } catch { return ""; } };

function formTema() {
  if (!navigator.onLine) { toast("Crear un tema requiere conexión."); return; }
  const f = h("form", { class: "form" },
    h("label", null, "Título del tema", h("input", { id: "ft", required: true, maxLength: 120, placeholder: "Ej.: Control de compactación – Plataforma norte" })),
    h("label", null, "Área", sel("fa", opAreas(), recordar("area"), "(Sin área)")),
    h("label", null, "Frente", sel("ff", opFrentes(), recordar("frente"), "(Sin frente)")),
    h("label", null, "Descripción (opcional)", h("textarea", { id: "fd", rows: 3 })),
    h("button", { class: "btn primary big", type: "submit" }, "Crear tema"));
  const cerrar = hoja("Nuevo tema", f);
  f.onsubmit = async e => {
    e.preventDefault(); const b = f.querySelector("button"); b.disabled = true;
    try {
      const id = await B.createTema({ titulo: f.ft.value.trim(), area: f.fa.value, frente: f.ff.value, descripcion: f.fd.value.trim() });
      await cargarDatos(true); cerrar(); location.hash = `#tema-${id}`;
    } catch (err) { toast("No se pudo crear: " + err.message, 6000); b.disabled = false; }
  };
}

function formReporte({ temaId, t }) {
  const abiertos = state.temas.filter(x => x.estado !== "Cerrado");
  if (!temaId && !abiertos.length) { toast("Primero crea un tema."); location.hash = "#temas"; return; }
  const fotos = []; // {blob,url}
  const grilla = h("div", { class: "thumbs" });
  const pintarFotos = () => grilla.replaceChildren(...fotos.map((x, i) =>
    h("div", { class: "thumb" }, h("img", { src: x.url, alt: `Foto ${i + 1}` }),
      h("button", { type: "button", "aria-label": "Quitar foto", onclick: () => { URL.revokeObjectURL(x.url); fotos.splice(i, 1); pintarFotos(); } }, "✕"))));
  const agregar = async files => {
    for (const file of files) {
      if (fotos.length >= 6) { toast("Máximo 6 fotos por reporte."); break; }
      try { const blob = await reducirFoto(file); fotos.push({ blob, url: URL.createObjectURL(blob) }); pintarFotos(); }
      catch (e) { toast(e.message); }
    }
  };
  const inCam = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true, onchange: async e => { await agregar([...e.target.files]); e.target.value = ""; } });
  const inGal = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: async e => { await agregar([...e.target.files]); e.target.value = ""; } });
  const f = h("form", { class: "form" },
    temaId ? h("p", { class: "meta" }, "Tema: ", h("strong", null, t.titulo))
      : h("label", null, "Tema", sel("rt", abiertos.map(x => ({ v: x.id, t: x.titulo })), "")),
    h("div", { class: "seg", role: "radiogroup", "aria-label": "Tipo" },
      ["Reporte diario", "Comentario"].map((v, i) => h("label", null, h("input", { type: "radio", name: "tipo", value: v, checked: i === 0 }), h("span", null, v)))),
    h("div", { class: "two" },
      h("label", null, "Fecha", h("input", { id: "rf", type: "date", value: hoy(), required: true })),
      h("label", null, "Área", sel("ra", opAreas(), recordar("area") || t?.area, "—"))),
    h("label", null, "Frente", sel("rr", opFrentes(), recordar("frente") || t?.frente, "—")),
    h("label", null, "¿Qué se hizo / qué observaste?", h("textarea", { id: "rx", rows: 5, required: true, placeholder: "Actividades, resultados, incidencias, cifras y unidades…" })),
    h("div", { class: "photo-btns" },
      h("button", { type: "button", class: "btn", onclick: () => inCam.click() }, "📷 Cámara"),
      h("button", { type: "button", class: "btn", onclick: () => inGal.click() }, "🖼 Galería")),
    inCam, inGal, grilla,
    h("button", { class: "btn primary big", type: "submit" }, "Enviar reporte"));
  if (!temaId && f.rt) f.rt.value = abiertos[0].id;
  const cerrar = hoja("Nuevo reporte", f);
  f.onsubmit = async e => {
    e.preventDefault();
    const tipo = f.querySelector("input[name=tipo]:checked").value;
    recordar("area", f.ra.value); recordar("frente", f.rr.value);
    const datos = { temaId: temaId || f.rt.value, fecha: f.rf.value, area: f.ra.value, frente: f.rr.value, tipo, texto: f.rx.value.trim() };
    if (fotos.length) datos.fotoBase = nuevaBase(datos.fecha, datos.frente, datos.area);
    await encolar(datos, fotos.map(x => x.blob));
    cerrar();
    toast(navigator.onLine ? "Enviando…" : "Guardado. Se enviará cuando haya señal.");
    route();
  };
}

/* ---------- router ---------- */
function route() {
  const hash = location.hash || "#temas";
  document.querySelectorAll(".tabbar a").forEach(a => {
    const k = a.dataset.tab;
    a.classList.toggle("on", (k === "temas" && (hash === "#temas" || hash.startsWith("#tema-"))) || (k === "hoy" && hash === "#hoy") || (k === "mas" && hash === "#mas"));
  });
  const wrap = async fn => { try { await fn(); } catch (e) { montar(vacio("⚠️", "No se pudo cargar", e.message + (DEMO ? "" : "\n\nSi es la primera vez, entra a Más → Administrador → Preparar sitio."), h("button", { class: "btn", onclick: () => { state.cargado = false; route(); } }, "Reintentar"))); } };
  const m = /^#tema-(.+)$/.exec(hash);
  if (m) return wrap(() => vistaTema(m[1]));
  if (hash === "#hoy") return wrap(vistaHoy);
  if (hash === "#mas") return wrap(vistaMas);
  return wrap(vistaTemas);
}
addEventListener("hashchange", route);

/* ---------- arranque ---------- */
async function inicio() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!DEMO) {
    let cuenta = null;
    try { cuenta = await initAuth(); } catch (e) { montar(vacio("⚠️", "Error de inicio de sesión", e.message)); return; }
    if (!cuenta) {
      document.querySelector(".tabbar").hidden = true;
      montar(vacio("🔐", "Bienvenido a CQA Campo", "Inicia sesión con tu cuenta de la empresa para enviar y ver reportes.",
        h("button", { class: "btn primary big", onclick: () => entrar() }, "Iniciar sesión con Microsoft")));
      return;
    }
  }
  state.yo = await B.yo();
  await leerPendientes();
  route();
  void vaciarCola();
}
inicio();
