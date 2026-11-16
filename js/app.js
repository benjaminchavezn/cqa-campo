import { DEMO, cfg, h, hoy, area, nomArea, diaLargo, fechaDMA, hora, haceCuanto, iniciales, nombreCorto, reducirFoto, nuevaBase, espDeCargo } from "./util.js";
import { AREAS, CARGOS, EMPRESAS, P } from "./catalogos.js";
import { initAuth, entrar, salir } from "./auth.js";
import { toast, etiqueta, vacio, cargando, mosaico, hoja, confirmar, sel, montar, go } from "./ui.js";
import { B, S, hooks, cargar, leerPend, encolar, vaciarCola, descartar, reintentar, respDe, actividad, noLeido, marcarLeido, hayNovedades,
  esAdmin, supervisa, veTodas, activo, misAreas, puedeVer, soyYo, nombreDe, colabDe } from "./estado.js";
import { vistaPerfil, vistaConfig, vistaActividad, vistaAdmin, vistaFicha, sitioPreparar } from "./cuenta.js";

const $ = id => document.getElementById(id);
hooks.toast = toast;
hooks.repintar = () => route();
const wa = (txt = "") => `https://wa.me/${P.soporte}${txt ? "?text=" + encodeURIComponent(txt) : ""}`;
const yoNombre = () => S.perfil?.nombre || S.yo.nombre;

/* ---------- encabezado, estado y tema ---------- */
function pintarEstado() {
  const n = S.pend.length, e = $("estado");
  e.className = "estado " + (!navigator.onLine ? "off" : n ? "wait" : "ok");
  e.replaceChildren(...[!navigator.onLine ? (n ? `Sin conexión · ${n} pendiente${n > 1 ? "s" : ""}` : "Sin conexión") : n ? `Conectado · ${n} pendiente${n > 1 ? "s" : ""}` : (DEMO ? "Modo demostración" : "Conectado"),
    n && navigator.onLine ? h("button", { onclick: () => vaciarCola() }, "Enviar ahora") : null].filter(Boolean));
  const nuevas = S.temas.some(t => soyYo(t.autorEmail) && noLeido(t));
  $("av-dot").hidden = !nuevas;
}
hooks.estado = pintarEstado;
function pintarAvatar() { $("av-txt").textContent = iniciales(yoNombre()); }
const oscuro = () => { const t = document.documentElement.dataset.tema; return t ? t === "oscuro" : matchMedia("(prefers-color-scheme: dark)").matches; };
function pintarTema() { $("btn-tema").textContent = oscuro() ? "☀" : "☾"; }
$("btn-tema").onclick = () => {
  const t = oscuro() ? "claro" : "oscuro"; document.documentElement.dataset.tema = t;
  try { localStorage.setItem("cqa_tema", t); } catch { /* sin almacenamiento */ } pintarTema();
};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pintarTema);
$("logo").onclick = () => go("#inicio");

/* ---------- paneles laterales ---------- */
let abierto = null;
function cerrarPanel(desdeAtras) {
  if (!abierto) return;
  const el = $(abierto === "l" ? "drawer-l" : "drawer-r"); abierto = null;
  el.classList.remove("open"); $("scrim").hidden = true; setTimeout(() => { if (!abierto) el.hidden = true; }, 230);
  if (!desdeAtras && history.state?.panel) history.back();
}
addEventListener("popstate", () => cerrarPanel(true));
addEventListener("keydown", e => { if (e.key === "Escape") cerrarPanel(); });
$("scrim").onclick = () => cerrarPanel();
function abrirPanel(lado) {
  if (abierto) { cerrarPanel(); return; }
  const el = $(lado === "l" ? "drawer-l" : "drawer-r");
  el.replaceChildren(...(lado === "l" ? contenidoIzq() : contenidoDer()).filter(Boolean));
  el.hidden = false; $("scrim").hidden = false; abierto = lado; history.pushState({ panel: lado }, "");
  requestAnimationFrame(() => el.classList.add("open"));
  let x0 = null;   // deslizar hacia el borde para cerrar
  el.ontouchstart = e => { x0 = e.touches[0].clientX; };
  el.ontouchend = e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if ((lado === "l" && dx < -60) || (lado === "r" && dx > 60)) cerrarPanel(); x0 = null; };
}
function irDesdePanel(hash) {
  if (history.state?.panel) { addEventListener("popstate", () => go(hash), { once: true }); cerrarPanel(); } else go(hash);
}
const fila = (icono, texto) => [h("span", { class: "ic" }, icono), h("span", null, texto)];
const item = (icono, texto, hash, extra) => h("a", { class: "mi", href: hash, onclick: e => { e.preventDefault(); irDesdePanel(hash); } }, fila(icono, texto), extra);
$("btn-menu").onclick = () => abrirPanel("l");
$("btn-avatar").onclick = () => abrirPanel("r");

function contenidoIzq() {
  const pendientes = S.pend.length;
  return [
    item("≋", "Temas", "#temas", hayNovedades() ? h("span", { class: "p" }, "●") : null),
    item("📌", "Mis publicaciones", "#mis"),
    item("📤", `Pendientes de envío (${pendientes})`, "#pend"),
    item("🔎", "Buscar", "#buscar"), h("hr"), h("div", { class: "dt" }, "ÁREAS"),
    ...AREAS.filter(a => misAreas().includes(a.codigo)).map(a => item(h("span", { class: "sq", style: { background: a.color } }), a.nombre, `#temas-${a.codigo}`,
      S.temas.some(t => t.area === a.codigo && puedeVer(t) && noLeido(t)) ? h("span", { class: "p" }, "●") : null)),
    item("≡", "Todas mis áreas", "#temas"), h("hr"),
    item("📷", "Nuevo reporte", "#inicio"),
    h("a", { class: "mi", href: wa("Hola, necesito ayuda con CQA Campo."), target: "_blank", rel: "noopener" }, fila("❓", "Ayuda · WhatsApp"))];
}
function contenidoDer() {
  const p = S.perfil;
  return [
    h("div", { class: "dh" }, h("div", { class: "avatar" }, iniciales(yoNombre())),
      h("div", null, h("strong", null, yoNombre() || "—"), h("div", { class: "meta" }, p?.cargo || ""), h("div", { class: "meta" }, p?.empresa || ""))),
    h("div", { class: "mi" }, fila(navigator.onLine ? "●" : "○", navigator.onLine ? "En línea" : "Sin conexión")), h("hr"),
    item("👤", "Resumen", "#perfil"), item("≡", "Actividad", "#actividad"),
    item("✎", `Borradores y pendientes (${S.pend.length})`, "#pend"), item("⚙", "Preferencias", "#config"),
    esAdmin() ? item("🛠", "Administración", "#admin") : null, h("hr"),
    h("button", { class: "mi", onclick: async () => {
      if (S.pend.length) { toast("Tienes envíos pendientes. Envíalos antes de cerrar sesión."); return; }
      if (DEMO) { toast("En la demostración no hay sesión."); return; }
      if (await confirmar("Cerrar sesión", "Para volver a entrar necesitarás iniciar sesión otra vez con tu cuenta de la empresa.", "CERRAR SESIÓN")) salir();
    } }, fila("⎋", "Cerrar sesión"))];
}

/* ---------- inicio (P-03) ---------- */
const recordar = (k, v) => { try { return v !== undefined ? localStorage.setItem("cqa_" + k, JSON.stringify(v)) : JSON.parse(localStorage.getItem("cqa_" + k)); } catch { return null; } };

function vistaSinRegistro() {
  const log = h("pre", { class: "log", hidden: true });
  const prep = !DEMO ? h("div", { class: "card" }, h("h3", null, "Soy administrador del sitio"),
    h("p", { class: "meta" }, "Solo la primera vez: crea en SharePoint las listas del foro y de colaboradores."),
    h("button", { class: "btn", onclick: () => sitioPreparar(log, () => { S.cargado = false; route(); }) }, "Preparar sitio de SharePoint"), log) : null;
  if (S.errorColabs) return montar(vacio("🛠", "Falta preparar el sitio", "No se encontró la lista de colaboradores.\n" + S.errorColabs), prep);
  if (!S.colabs.length) {   // primer usuario = administrador
    const f = h("form", { class: "form" },
      h("p", null, "Todavía no hay colaboradores registrados. Serás el primer administrador; luego registrarás al resto desde el panel de administración."),
      h("label", null, "Nombres", h("input", { id: "n", required: true, value: (S.yo.nombre.split(" ")[0] || "") })),
      h("label", null, "Apellidos", h("input", { id: "a", required: true, value: S.yo.nombre.split(" ").slice(1).join(" ") })),
      h("label", null, "Cargo", sel("c", CARGOS.map(c => c.n), "Jefe de servicio")),
      h("label", null, "Empresa", sel("e", EMPRESAS, "Clean Technology")),
      h("label", null, "Celular (WhatsApp)", h("input", { id: "t", type: "tel", placeholder: "+51 9", required: true })),
      h("button", { class: "btn primary big", type: "submit" }, "Crear mi registro de administrador"));
    f.onsubmit = async e => {
      e.preventDefault(); const b = f.querySelector("button"); b.disabled = true;
      try {
        await B.saveColaborador({ email: S.yo.email, nombres: f.n.value.trim(), apellidos: f.a.value.trim(), dni: "", celular: f.t.value.trim(), cargo: f.c.value, empresa: f.e.value,
          empresaOtros: "", areas: AREAS.map(a => a.codigo), grupo: "", rol: "Administrador", estado: "Activo", registrado: hoy() }, "Alta del primer administrador");
        S.cargado = false; await cargar(); pintarAvatar(); route();
      } catch (er) { toast("No se pudo registrar: " + er.message, 6000); b.disabled = false; }
    };
    return montar(h("h2", null, "Bienvenido a CQA Campo"), f, prep);
  }
  montar(vacio("🔒", "Tu cuenta aún no está registrada", `Cuenta: ${S.yo.email}\nPide a tu supervisor que te registre y te asigne tus áreas.`,
    h("a", { class: "btn primary", href: wa(`Hola, necesito que registren mi cuenta en CQA Campo (${S.yo.email}).`), target: "_blank", rel: "noopener" }, "Escribir por WhatsApp")), prep);
}

function vistaInicio() {
  if (!S.perfil) return vistaSinRegistro();
  const p = S.perfil, mias = misAreas(), ocultar = mias.length <= 1 && !veTodas(), suspendido = !activo();
  const botones = AREAS.filter(a => !(ocultar && !mias.includes(a.codigo))).map(a => {
    const ok = mias.includes(a.codigo) && !suspendido;
    return h("button", { class: "area-btn" + (ok ? "" : " lock"), style: ok ? { background: a.color } : null, onclick: () => {
      if (suspendido) return toast("Acceso suspendido. Tus reportes guardados se conservan.", 5000);
      if (!ok) return toast("Esta área no está asignada a ti. Consulta a tu supervisor.", 5000);
      if (!S.borrador || S.borrador.area !== a.codigo) S.borrador = { area: a.codigo, lugar: "", fecha: hoy(), titulo: "", descripcion: "", fotos: [] };
      go(a.codigo === "OTR" ? "#lugar" : "#nuevo");
    } }, ok ? "" : "🔒 ", a.nombre, !ok ? h("small", null, "No autorizado") : a.codigo === "OTR" ? h("small", null, "Indicar lugar") : null);
  });
  const nuevos = S.temas.filter(t => puedeVer(t) && noLeido(t)).length;
  montar(h("div", { class: "hola" }, h("h2", null, `Hola, ${p.nombre}`), h("div", { class: "meta" }, p.cargo)),
    !mias.length ? h("div", { class: "card warn" }, "No tienes áreas asignadas. No puedes reportar hasta que te asignen una.") : null,
    h("h3", null, "¿EN QUÉ ÁREA VAS A REPORTAR?"), h("div", { class: "areas" }, botones),
    nuevos ? h("div", { class: "card aviso" }, h("div", null, h("strong", null, "Actividad en tus áreas"), h("div", { class: "meta" }, `● ${nuevos} tema${nuevos > 1 ? "s" : ""} con novedades`)),
      h("a", { class: "btn sm", href: "#nuevos" }, "Ver temas")) : null);
}

/* ---------- OTROS: lugar (P-04) ---------- */
function vistaLugar() {
  const b = S.borrador; if (!b) return go("#inicio");
  const rec = recordar("lugares") || [];
  const inp = h("input", { id: "lg", placeholder: "Escribe el lugar", maxLength: 80, value: b.lugar || "" });
  const seguir = () => { const v = inp.value.trim(); if (!v) return toast("Escribe el lugar."); b.lugar = v; recordar("lugares", [v, ...rec.filter(x => x !== v)].slice(0, 6)); go("#nuevo"); };
  montar(h("a", { class: "back", href: "#inicio" }, "‹ Volver"), h("h2", null, "ÁREA: OTROS"), h("div", { class: "form" },
    h("label", null, "¿Dónde estás trabajando?", inp),
    rec.length ? h("div", null, h("div", { class: "meta" }, "Usados recientemente:"), h("div", { class: "chips" }, rec.map(r => h("button", { class: "chip", type: "button", onclick: () => { inp.value = r; } }, r)))) : null,
    h("button", { class: "btn primary big", onclick: seguir }, "CONTINUAR")));
}

/* ---------- nuevo reporte (P-05 / P-06 / P-07) ---------- */
function vistaNuevo() {
  const b = S.borrador; if (!b || !S.perfil) return go("#inicio");
  if (b.area === "OTR" && !b.lugar) return go("#lugar");
  const a = area(b.area), mosaicoEl = h("div"), cnt = h("h3");
  const pintar = () => {
    cnt.textContent = `Fotografías (${b.fotos.length} de ${P.maxFotos})`;
    mosaicoEl.replaceChildren(b.fotos.length ? mosaico(b.fotos.map(f => ({ url: f.url })), { editar: {
      quitar: i => { URL.revokeObjectURL(b.fotos[i].url); b.fotos.splice(i, 1); pintar(); },
      mover: (i, d) => { const t = b.fotos[i]; b.fotos[i] = b.fotos[i + d]; b.fotos[i + d] = t; pintar(); } } })
      : h("p", { class: "meta" }, "Agrega de 1 a 4 fotos. El número es el lugar que ocuparán en el mosaico de Excel."));
    cam.disabled = gal.disabled = b.fotos.length >= P.maxFotos; sig.disabled = !b.fotos.length;
  };
  const agregar = async files => {
    for (const file of files) {
      if (b.fotos.length >= P.maxFotos) { toast(`Máximo ${P.maxFotos} fotos por reporte.`); break; }
      try { const blob = await reducirFoto(file); b.fotos.push({ blob, url: URL.createObjectURL(blob) }); pintar(); } catch (e) { toast(e.message); }
    }
  };
  const inCam = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true, onchange: async e => { await agregar([...e.target.files]); e.target.value = ""; } });
  const inGal = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: async e => { await agregar([...e.target.files]); e.target.value = ""; } });
  const cam = h("button", { type: "button", class: "btn", onclick: () => inCam.click() }, "📷 TOMAR FOTOGRAFÍA");
  const gal = h("button", { type: "button", class: "btn", onclick: () => inGal.click() }, "🖼 CARGAR DEL DISPOSITIVO");
  const sig = h("button", { type: "button", class: "btn primary big", onclick: () => go("#confirmar") }, "REVISAR Y GUARDAR");
  const radio = (v, t) => h("label", { class: "opt" }, h("input", { type: "radio", name: "fe", value: v, checked: b.fecha === v, onchange: () => { b.fecha = v; } }), t);
  montar(h("div", { class: "franja", style: { background: a.color } }, h("span", null, a.nombre + (b.lugar ? ` · ${b.lugar}` : "")),
      h("button", { onclick: () => go("#inicio") }, "Cambiar área")),
    h("p", { class: "meta" }, `${yoNombre()} · ${S.perfil.cargo}`),
    h("div", { class: "form" },
      h("div", null, h("strong", null, "Fecha"), h("div", { class: "two", style: { marginTop: "6px" } }, radio(hoy(), `Hoy ${fechaDMA(hoy()).slice(0, 5)}`), radio(hoy(-1), `Ayer ${fechaDMA(hoy(-1)).slice(0, 5)}`))),
      h("label", null, "Título", h("input", { maxLength: 80, value: b.titulo, placeholder: "Ej.: Vaciado de losa eje 3", oninput: e => { b.titulo = e.target.value; } })),
      h("label", null, "Descripción", h("textarea", { rows: 4, maxLength: 2000, value: b.descripcion, placeholder: "Actividades, resultados, incidencias, cifras y unidades…", oninput: e => { b.descripcion = e.target.value; } })),
      cam, gal, inCam, inGal, cnt, mosaicoEl, sig));
  pintar();
}
function vistaConfirmar() {
  const b = S.borrador; if (!b || !b.fotos.length) return go("#inicio");
  const a = area(b.area), p = S.perfil;
  const titulo = b.titulo.trim() || `${a.nombre} · ${fechaDMA(b.fecha)} · ${p.nombre}`;
  const veran = S.colabs.filter(c => c.estado === "Activo" && (c.areas.includes(b.area) || c.cargo === "Jefe de servicio" || c.rol === "Administrador")).length;
  montar(h("a", { class: "back", href: "#nuevo" }, "‹ Editar"), h("h2", null, "CONFIRMA TU REPORTE"),
    h("div", { class: "card" }, h("dl", { class: "kv" },
      h("dt", null, "Área"), h("dd", null, a.nombre + (b.lugar ? ` · ${b.lugar}` : "")), h("dt", null, "Fecha"), h("dd", null, (b.fecha === hoy() ? "Hoy " : b.fecha === hoy(-1) ? "Ayer " : "") + fechaDMA(b.fecha)),
      h("dt", null, "Título"), h("dd", null, titulo), h("dt", null, "Fotos"), h("dd", null, String(b.fotos.length)),
      h("dt", null, "Lo verán"), h("dd", null, veran ? `${veran} colaboradores del área` : "Tu equipo del área"))),
    mosaico(b.fotos.map(f => ({ url: f.url }))),
    h("button", { class: "btn primary big", onclick: async e => {
      e.target.disabled = true;
      await encolar("reporte", { fecha: b.fecha, area: b.area, lugar: b.lugar, titulo: titulo.slice(0, 80), descripcion: b.descripcion.trim(), tipo: "Reporte", cargo: p.cargo,
        empresa: p.empresa, esp: espDeCargo(p.cargo), autorEmail: S.yo.email, autorNombre: p.nombre, fotoBase: nuevaBase(b.fecha, b.area, espDeCargo(p.cargo)) }, b.fotos.map(f => f.blob));
      S.guardado = a; S.borrador = null; go("#guardado");
    } }, "GUARDAR REPORTE"));
}
function vistaGuardado() {
  const a = S.guardado || AREAS[0];
  montar(h("div", { class: "empty" }, h("div", { class: "ok-big" }, "✓"), h("h3", null, "Reporte guardado en este celular."),
    h("p", null, `Al tener conexión se publicará en el foro de ${a.nombre.toUpperCase()}.`)),
    h("a", { class: "btn primary big", href: "#inicio" }, "NUEVO REPORTE"), h("a", { class: "btn", href: "#pend" }, "VER PENDIENTES"));
}

/* ---------- lista de temas (P-10b) ---------- */
let orden = "Recientes";
const ESTADO_TAG = { Abierto: "blue", Observado: "amber", Levantado: "ok", Cerrado: "" };
function tarjetaTema(t) {
  const a = area(t.area), n = respDe(t.id).length, rs = respDe(t.id), ult = rs[rs.length - 1];
  return h("a", { class: "card topic" + (noLeido(t) ? " nuevo" : ""), href: `#tema-${t.id}` }, h("div", { class: "fr", style: { background: a.color } }),
    h("div", { class: "tb" }, h("div", { class: "row" }, h("h3", null, (t.fijado ? "📌 " : "") + t.titulo), h("span", { class: "n" }, String(n))),
      h("div", { class: "meta" }, `${a.abrev} · ${nombreCorto(nombreDe(t.autorEmail, t.autorNombre))} · ${diaLargo(t.fecha)}`),
      h("div", { class: "tags" }, t.estado !== "Abierto" || t.tipo === "Tema general" ? etiqueta(t.estado, ESTADO_TAG[t.estado]) : null, t.tipo === "Tema general" ? etiqueta("General", "teal") : null,
        ult ? etiqueta(`Última: ${nombreCorto(nombreDe(ult.autorEmail, ult.autorNombre))} · hace ${haceCuanto(ult.creado)}`) : null)));
}
function pendCard(p) {
  const d = p.data; return h("a", { class: "card", href: "#pend" }, h("div", { class: "row" }, h("strong", null, p.kind === "reporte" ? d.titulo : "Respuesta pendiente"), etiqueta("Pendiente de envío", "amber")),
    h("div", { class: "meta" }, p.kind === "reporte" ? `${nomArea(d.area)} · ${fechaDMA(d.fecha)} · ${p.fotos.length} foto(s)` : (d.texto || "Con adjuntos")));
}
async function vistaLista(modo) {
  const m = /^#temas-(\w+)$/.exec(location.hash), areaCod = m ? m[1] : "";
  if (location.hash === "#nuevos") orden = "Nuevos"; if (location.hash === "#mis") orden = "Míos";
  if (location.hash === "#temas" && modo !== "keep") { /* conserva el orden elegido */ }
  montar(cargando()); await cargar();
  if (!S.perfil) return vistaSinRegistro();
  const lista = h("div", { class: "list" });
  const chips = h("div", { class: "chips" }, ["Recientes", "Nuevos", "Observados", "Míos"].map(f => h("button", { class: "chip" + (orden === f ? " on" : ""), onclick: () => { orden = f; vistaLista("keep"); } }, f)));
  const pintar = () => {
    let ts = S.temas.filter(puedeVer).filter(t => !areaCod || t.area === areaCod);
    if (orden === "Nuevos") ts = ts.filter(noLeido); else if (orden === "Observados") ts = ts.filter(t => t.estado === "Observado"); else if (orden === "Míos") ts = ts.filter(t => soyYo(t.autorEmail));
    ts.sort((a, b) => (b.fijado - a.fijado) || actividad(b).localeCompare(actividad(a)));
    const pend = S.pend.filter(p => p.kind === "reporte" && (!areaCod || p.data.area === areaCod));
    lista.replaceChildren(...pend.map(pendCard), ...(ts.length || pend.length ? ts.map(tarjetaTema) : [vacio("💬", orden === "Recientes" ? "Aún no hay temas" : "Nada en esta lista", "Cada reporte enviado abre un tema visible para tu área.")]));
  };
  montar(areaCod ? h("div", { class: "franja", style: { background: area(areaCod).color } }, h("span", null, area(areaCod).nombre), h("button", { onclick: () => go("#temas") }, "Ver todas")) : h("h2", null, "Temas"),
    h("div", { class: "tools" }, chips, h("button", { class: "fabtn", "aria-label": "Nuevo reporte", onclick: () => go("#inicio") }, "✎")),
    supervisa() ? h("button", { class: "btn sm", style: { marginBottom: "10px" }, onclick: () => formTemaGeneral() }, "＋ Tema general") : null, lista);
  pintar();
}
function formTemaGeneral() {
  const f = h("form", { class: "form" },
    h("label", null, "Área", sel("ga", misAreas().map(c => ({ v: c, t: nomArea(c) })), misAreas()[0])),
    h("label", null, "Título", h("input", { id: "gt", required: true, maxLength: 80 })),
    h("label", null, "Mensaje", h("textarea", { id: "gd", rows: 4, maxLength: 2000 })),
    h("button", { class: "btn primary big", type: "submit" }, "PUBLICAR TEMA"));
  const cerrar = hoja("Tema general", f);
  f.onsubmit = async e => {
    e.preventDefault(); const p = S.perfil;
    await encolar("reporte", { fecha: hoy(), area: f.ga.value, lugar: "", titulo: f.gt.value.trim(), descripcion: f.gd.value.trim(), tipo: "Tema general", cargo: p.cargo,
      empresa: p.empresa, esp: espDeCargo(p.cargo), autorEmail: S.yo.email, autorNombre: p.nombre, fotoBase: "" }, []);
    cerrar(); toast("Guardado. Se publicará al enviarse."); route();
  };
}
async function vistaBuscar() {
  montar(cargando()); await cargar();
  const lista = h("div", { class: "list" });
  const q = h("input", { type: "search", placeholder: "Título, descripción, autor o fecha", "aria-label": "Buscar", oninput: () => pintar() });
  const pintar = () => {
    const s = q.value.trim().toLowerCase(); if (!s) { lista.replaceChildren(h("p", { class: "meta" }, "Busca dentro de tus áreas por título, descripción, autor o fecha (dd/mm/aaaa).")); return; }
    const r = S.temas.filter(puedeVer).filter(t => `${t.titulo} ${t.descripcion} ${nombreDe(t.autorEmail, t.autorNombre)} ${t.fecha} ${fechaDMA(t.fecha || "0-0-0")}`.toLowerCase().includes(s));
    lista.replaceChildren(...(r.length ? r.map(tarjetaTema) : [vacio("🔎", "Sin resultados", "Prueba con otra palabra.")]));
  };
  montar(h("h2", null, "Buscar"), q, h("div", { style: { height: "10px" } }), lista); pintar(); q.focus();
}

/* ---------- tema (P-11) ---------- */
const fotosDe = async (base, fecha) => { const m = await B.fotosDelDia(fecha); return (m.get(base) || []); };
const fotoItems = fs => fs.map(f => ({ cargar: () => B.fotoUrl(f.id) }));
function postHtml({ nombre, email, cargo, empresa, cuando, extra, cuerpo }) {
  return h("article", { class: "post" }, h("button", { class: "avatar", "aria-label": "Ver perfil de " + nombre, onclick: () => email && go("#perfil-" + encodeURIComponent(email)) }, iniciales(nombre)),
    h("div", { class: "body" }, h("div", { class: "who" }, h("strong", null, nombre), h("span", { class: "meta" }, `${cargo || ""}${empresa ? " · " + empresa : ""}`), h("span", { class: "meta" }, cuando)), extra, cuerpo));
}
async function vistaTema(id) {
  montar(cargando()); await cargar();
  const t = S.temas.find(x => x.id === String(id));
  if (!t || !puedeVer(t)) return montar(vacio("🔎", "Tema no encontrado", "Puede que no tengas acceso a esta área.", h("a", { class: "btn", href: "#temas" }, "Volver")));
  marcarLeido(t.id); pintarEstado();
  const a = area(t.area), cerrado = t.estado === "Cerrado", rs = respDe(id);
  const orig = h("div"), hilo = h("div");
  if (t.nfotos && t.fotoBase) fotosDe(t.fotoBase, t.fecha).then(fs => { const o = fs.filter(f => f.n <= t.nfotos); orig.replaceChildren(o.length ? mosaico(fotoItems(o)) : h("p", { class: "nota" }, "Las fotos aún no están disponibles.")); })
    .catch(() => orig.replaceChildren(h("p", { class: "nota" }, "No se pudieron cargar las fotos.")));
  const mapaFotos = t.fotoBase ? await fotosDe(t.fotoBase, t.fecha).catch(() => []) : [];
  const respHtml = r => {
    const cuerpo = h("div"), fotos = [], tags = [];
    if (r.kind === "Refuerzo") tags.push(etiqueta("Refuerzo de evidencia", "teal"));
    if (r.kind === "Observación") tags.push(etiqueta("Marcado como observación", "amber"));
    if (r.kind === "Levantamiento") tags.push(etiqueta("Observación levantada", "ok"));
    if (r.texto) cuerpo.append(h("p", { class: "text" }, r.texto));
    for (const ad of r.adjuntos) {
      if (ad.t === "foto") { const f = (ad.base === t.fotoBase ? mapaFotos : []).find(x => x.n === ad.n); if (f) fotos.push({ cargar: () => B.fotoUrl(f.id) }); else fotos.push({ cargar: async () => { const fs = await fotosDe(ad.base, t.fecha); const x = fs.find(y => y.n === ad.n); if (!x) throw new Error("sin foto"); return B.fotoUrl(x.id); } }); }
      else if (ad.t === "enlace") cuerpo.append(h("a", { class: "adj", href: ad.url, target: "_blank", rel: "noopener noreferrer" }, "🔗 ", ad.url));
      else if (ad.t === "pdf") cuerpo.append(h("button", { class: "adj", onclick: async () => window.open(await B.adjuntoUrl(ad.id), "_blank") }, "📄 ", ad.nombre || "PDF"));
      else if (ad.t === "video") { const v = h("button", { class: "adj", onclick: async e => { e.currentTarget.disabled = true; const u = await B.adjuntoUrl(ad.id); e.currentTarget.replaceWith(h("video", { src: u, controls: true, playsinline: true })); } }, "🎬 Ver video ", ad.nombre || ""); cuerpo.append(v); }
    }
    if (fotos.length) cuerpo.prepend(mosaico(fotos));
    const minutos = (Date.now() - new Date(r.creado)) / 60000;
    const propia = soyYo(r.autorEmail);
    if ((propia && minutos <= P.editarMin) || supervisa()) cuerpo.append(h("button", { class: "link", onclick: async () => {
      if (await confirmar(propia && minutos <= P.editarMin ? "Eliminar respuesta" : "Ocultar respuesta", "La respuesta dejará de mostrarse en el foro.", "ACEPTAR")) { try { await B.ocultarRespuesta(r.id); await cargar(true); route(); } catch (e) { toast(e.message); } }
    } }, propia && minutos <= P.editarMin ? "Eliminar" : "Ocultar (supervisión)"));
    return postHtml({ nombre: nombreDe(r.autorEmail, r.autorNombre), email: r.autorEmail, cargo: r.cargo, empresa: r.empresa, cuando: haceCuanto(r.creado) === "ahora" ? "ahora" : `hace ${haceCuanto(r.creado)}`, extra: tags.length ? h("div", { class: "tags" }, tags) : null, cuerpo });
  };
  hilo.append(...rs.map(respHtml));
  for (const p of S.pend.filter(x => x.kind === "respuesta" && x.data.temaId === String(id))) {
    const c = h("div", null, p.data.texto ? h("p", { class: "text" }, p.data.texto) : null, p.fotos.length ? mosaico(p.fotos.map(b => ({ url: URL.createObjectURL(b) }))) : null,
      etiqueta("Pendiente de envío", "amber"));
    const pe = postHtml({ nombre: yoNombre(), email: S.yo.email, cargo: S.perfil.cargo, empresa: S.perfil.empresa, cuando: "ahora", cuerpo: c }); pe.classList.add("pending"); hilo.append(pe);
  }
  const acciones = cerrado ? h("p", { class: "nota" }, "Tema cerrado: solo lectura.") : h("div", { class: "acciones" },
    h("button", { class: "btn", onclick: () => formRespuesta(t, "responder") }, "💬 RESPONDER"), h("button", { class: "btn", onclick: () => formRespuesta(t, "reforzar") }, "📷 REFORZAR"));
  const sup = supervisa() ? h("div", { class: "acciones" },
    h("button", { class: "btn", onclick: async () => { try { await B.setEstado(t.id, cerrado ? "Abierto" : "Cerrado"); await cargar(true); route(); } catch (e) { toast(e.message); } } }, cerrado ? "REABRIR TEMA" : "✓ CERRAR TEMA"),
    h("button", { class: "btn", onclick: async () => { try { await B.setFijado(t.id, !t.fijado); await cargar(true); route(); } catch (e) { toast(e.message); } } }, t.fijado ? "QUITAR FIJADO" : "📌 FIJAR")) : null;
  montar(h("a", { class: "back", href: "#temas" }, "‹ Temas"),
    h("div", { class: "thread-head" }, h("h2", null, (t.fijado ? "📌 " : "") + t.titulo), h("div", { class: "tags" }, h("span", { class: "tag area", style: { background: a.color } }, a.nombre + (t.lugar ? ` · ${t.lugar}` : "")), etiqueta(t.estado, ESTADO_TAG[t.estado]), t.tipo === "Tema general" ? etiqueta("Tema general", "teal") : null)),
    postHtml({ nombre: nombreDe(t.autorEmail, t.autorNombre), email: t.autorEmail, cargo: t.cargo, empresa: t.empresa, cuando: `Actividad: ${diaLargo(t.fecha)} · ${haceCuanto(t.creado) === "ahora" ? "ahora" : "hace " + haceCuanto(t.creado)}`,
      cuerpo: h("div", null, t.descripcion ? h("p", { class: "text" }, t.descripcion) : null, orig, acciones) }), hilo, sup);
}

/* ---------- responder (P-11b) ---------- */
function formRespuesta(t, modo) {
  const p = S.perfil, fotos = [], adj = []; let enlace = "";
  const mos = h("div"), lst = h("div"), enl = h("div");
  const hayAdj = () => fotos.length || adj.length || enlace.trim();
  const refrescar = () => {
    mos.replaceChildren(...[fotos.length ? mosaico(fotos.map(f => ({ url: f.url })), { editar: { quitar: i => { URL.revokeObjectURL(fotos[i].url); fotos.splice(i, 1); refrescar(); }, mover: (i, d) => { const x = fotos[i]; fotos[i] = fotos[i + d]; fotos[i + d] = x; refrescar(); } } }) : null].filter(Boolean));
    lst.replaceChildren(...adj.map((a, i) => h("div", { class: "adj" }, a.t === "pdf" ? "📄" : "🎬", ` ${a.nombre}`, h("button", { type: "button", class: "x", style: { marginLeft: "auto" }, onclick: () => { adj.splice(i, 1); refrescar(); } }, "✕"))));
    enviar.disabled = !(texto.value.trim() || hayAdj());
  };
  const texto = h("textarea", { rows: 4, maxLength: 2000, placeholder: "Escribe un comentario (opcional si adjuntas)", oninput: () => refrescar() });
  const agregarFotos = async files => {
    for (const f of files) { if (fotos.length >= P.maxFotos) { toast(`Hasta ${P.maxFotos} fotos por respuesta.`); break; } try { const b = await reducirFoto(f); fotos.push({ blob: b, url: URL.createObjectURL(b) }); } catch (e) { toast(e.message); } }
    refrescar();
  };
  const duracion = file => new Promise(res => { const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(v.src); }; v.onerror = () => res(0); v.src = URL.createObjectURL(file); });
  const inFoto = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: async e => { await agregarFotos([...e.target.files]); e.target.value = ""; } });
  const inCam = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true, onchange: async e => { await agregarFotos([...e.target.files]); e.target.value = ""; } });
  const inVid = h("input", { type: "file", accept: "video/*", hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > P.videoMB * 1048576) return toast(`El video pesa más de ${P.videoMB} MB.`);
    const d = await duracion(f); if (d > P.videoSeg + 1) return toast(`El video debe durar hasta ${P.videoSeg} s.`);
    if (navigator.connection?.type === "cellular" && !recordar("datos") && !(await confirmar("Datos móviles", "Estás usando datos móviles. ¿Enviar el video de todos modos?", "ENVIAR"))) return;
    adj.push({ t: "video", nombre: f.name, blob: f }); refrescar(); } });
  const inPdf = h("input", { type: "file", accept: "application/pdf", hidden: true, onchange: e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (f.size > P.pdfMB * 1048576) return toast(`El PDF pesa más de ${P.pdfMB} MB.`); adj.push({ t: "pdf", nombre: f.name, blob: f }); refrescar(); } });
  const inEnlace = h("input", { type: "url", placeholder: "https://…", oninput: e => { enlace = e.target.value; refrescar(); } });
  const obs = supervisa() && t.estado !== "Cerrado" ? h("input", { type: "checkbox", id: "ob" }) : null;
  const lev = soyYo(t.autorEmail) && t.estado === "Observado" ? h("input", { type: "checkbox", id: "lv" }) : null;
  const enviar = h("button", { class: "btn primary big", type: "submit", disabled: true }, "ENVIAR");
  const f = h("form", { class: "form" }, texto,
    h("div", null, h("strong", null, "Adjuntar:"), h("div", { class: "two", style: { marginTop: "6px" } },
      h("button", { type: "button", class: "btn sm", onclick: () => inFoto.click() }, "🖼 Foto"), h("button", { type: "button", class: "btn sm", onclick: () => inVid.click() }, "🎬 Video"),
      h("button", { type: "button", class: "btn sm", onclick: () => { enl.replaceChildren(inEnlace); inEnlace.focus(); } }, "🔗 Enlace"), h("button", { type: "button", class: "btn sm", onclick: () => inPdf.click() }, "📄 PDF"))),
    inFoto, inCam, inVid, inPdf, enl, mos, lst,
    obs ? h("label", { class: "opt" }, obs, "Marcar como observación") : null, lev ? h("label", { class: "opt" }, lev, "Marcar observación como levantada") : null, enviar);
  const cerrar = hoja("Responder a: " + t.titulo.slice(0, 40), f);
  if (modo === "reforzar") inCam.click();
  f.onsubmit = async e => {
    e.preventDefault(); enviar.disabled = true;
    const hayFoto = fotos.length > 0;
    const kind = lev?.checked ? "Levantamiento" : obs?.checked ? "Observación" : hayFoto && (modo === "reforzar" || !soyYo(t.autorEmail)) ? "Refuerzo" : "Respuesta";
    const esp = t.esp || espDeCargo(p.cargo);
    await encolar("respuesta", { temaId: t.id, temaFecha: t.fecha, area: t.area, esp, texto: texto.value.trim(), kind, enlace: enlace.trim(), cargo: p.cargo, empresa: p.empresa,
      estadoNuevo: kind === "Levantamiento" ? "Levantado" : kind === "Observación" ? "Observado" : "", fotoBase: t.fotoBase || nuevaBase(t.fecha, t.area, esp), baseNueva: !t.fotoBase,
      autorEmail: S.yo.email, autorNombre: p.nombre }, fotos.map(x => x.blob), adj);
    cerrar(); toast(navigator.onLine ? "Enviando…" : "Guardado. Se enviará cuando haya señal."); route();
  };
  refrescar();
}

/* ---------- pendientes ---------- */
async function vistaPend() {
  await leerPend();
  montar(h("h2", null, "Borradores y pendientes"), S.pend.length ? h("button", { class: "btn primary", onclick: () => vaciarCola() }, "ENVIAR PENDIENTES") : null, h("div", { style: { height: "10px" } }),
    h("div", { class: "list" }, S.pend.length ? S.pend.map(p => { const d = p.data;
      return h("div", { class: "card" }, h("div", { class: "row" }, h("strong", null, p.kind === "reporte" ? d.titulo : "Respuesta"), p.error ? etiqueta("Envío incompleto", "bad") : etiqueta("Pendiente de envío", "amber")),
        h("div", { class: "meta" }, p.kind === "reporte" ? `${nomArea(d.area)} · ${fechaDMA(d.fecha)} · ${p.fotos.length} foto(s)` : (d.texto || "Con adjuntos")), p.error ? h("p", { class: "meta" }, p.error) : null,
        h("div", { class: "two", style: { marginTop: "8px" } }, h("button", { class: "btn sm", onclick: async () => { await reintentar(p.key); setTimeout(vistaPend, 600); } }, "Reintentar"),
          h("button", { class: "btn sm bad", onclick: async () => { if (await confirmar("Descartar", "Se borrará del celular y no se enviará.", "DESCARTAR")) { await descartar(p.key); vistaPend(); } } }, "Descartar"))); })
      : [vacio("✅", "No hay nada pendiente", "Todo lo que escribiste ya se envió.")]));
}

/* ---------- router ---------- */
const ctx = { montar, go, cargar, route: () => route(), wa };
function route() {
  cerrarPanel(); pintarEstado(); pintarAvatar();
  const hash = location.hash || "#inicio";
  const wrap = async fn => { try { await fn(); } catch (e) { montar(vacio("⚠️", "No se pudo cargar", e.message + (DEMO ? "" : "\n\nSi es la primera vez, el administrador debe preparar el sitio."), h("button", { class: "btn", onclick: () => { S.cargado = false; route(); } }, "Reintentar"))); } };
  const needData = fn => wrap(async () => { if (!S.cargado) { montar(cargando()); await cargar(); pintarAvatar(); } await fn(); });
  let m;
  if ((m = /^#tema-(.+)$/.exec(hash))) return wrap(() => vistaTema(m[1]));
  if (/^#temas(-\w+)?$/.test(hash) || hash === "#nuevos" || hash === "#mis") return wrap(() => vistaLista());
  if (hash === "#buscar") return wrap(vistaBuscar);
  if (hash === "#lugar") return needData(vistaLugar);
  if (hash === "#nuevo") return needData(vistaNuevo);
  if (hash === "#confirmar") return needData(vistaConfirmar);
  if (hash === "#guardado") return wrap(vistaGuardado);
  if (hash === "#pend") return wrap(vistaPend);
  if ((m = /^#perfil(?:-(.+))?$/.exec(hash))) return needData(() => vistaPerfil(ctx, m[1] ? decodeURIComponent(m[1]) : ""));
  if (hash === "#actividad") return needData(() => vistaActividad(ctx));
  if (/^#config/.test(hash)) return needData(() => vistaConfig(ctx));
  if (hash === "#admin") return needData(() => vistaAdmin(ctx));
  if ((m = /^#admin-(.+)$/.exec(hash))) return needData(() => vistaFicha(ctx, m[1]));
  return needData(vistaInicio);
}
addEventListener("hashchange", route);

/* ---------- arranque ---------- */
async function inicio() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  pintarTema();
  if (!DEMO) {
    let cuenta = null;
    try { cuenta = await initAuth(); } catch (e) { montar(vacio("⚠️", "Error de inicio de sesión", e.message)); return; }
    if (!cuenta) {
      montar(vacio("🔐", "Bienvenido a CQA Campo", "Inicia sesión con tu cuenta de la empresa para enviar y ver reportes.", h("button", { class: "btn primary big", onclick: () => entrar() }, "Iniciar sesión con Microsoft")));
      return;
    }
  }
  S.yo = await B.yo();
  await leerPend();
  try { await cargar(); } catch (e) { /* route lo reintenta y muestra el error */ }
  pintarAvatar(); route(); void vaciarCola();
}
inicio();
