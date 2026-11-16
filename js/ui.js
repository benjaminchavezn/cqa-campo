import { h } from "./util.js";

export function toast(msg, ms = 3500) {
  const t = h("div", { class: "toast", role: "status" }, msg);
  document.body.append(t); setTimeout(() => t.remove(), ms);
}
export const etiqueta = (t, c = "") => t ? h("span", { class: "tag " + c }, t) : null;
export const vacio = (icono, titulo, texto, ...acc) => h("div", { class: "empty" }, h("div", { class: "empty-ico" }, icono), h("h3", null, titulo), h("p", null, texto), ...acc);
export const cargando = (t = "Cargando…") => h("div", { class: "loading" }, h("div", { class: "spin" }), t);

// Visor a pantalla completa: deslizar o usar las flechas para pasar de foto; pellizcar para ampliar.
export function visor(fotos, inicio = 0) {
  let i = inicio, x0 = null;
  const img = h("img", { alt: "" });
  const cont = h("div", { class: "vz-n" });
  const o = h("div", { class: "lightbox", role: "dialog", "aria-label": "Foto ampliada" },
    h("button", { class: "vz-x", "aria-label": "Cerrar", onclick: () => cerrar() }, "✕"),
    fotos.length > 1 ? h("button", { class: "vz-p", "aria-label": "Anterior", onclick: () => ir(-1) }, "‹") : null,
    img,
    fotos.length > 1 ? h("button", { class: "vz-s", "aria-label": "Siguiente", onclick: () => ir(1) }, "›") : null, cont);
  const cerrar = () => { o.remove(); removeEventListener("keydown", tecla); };
  const tecla = e => { if (e.key === "Escape") cerrar(); if (e.key === "ArrowLeft") ir(-1); if (e.key === "ArrowRight") ir(1); };
  async function ir(d) { i = (i + d + fotos.length) % fotos.length; await mostrar(); }
  async function mostrar() {
    cont.textContent = fotos.length > 1 ? `${i + 1} / ${fotos.length}` : "";
    const f = fotos[i]; img.src = f.url || (await f.cargar());
  }
  o.addEventListener("touchstart", e => { if (e.touches.length === 1) x0 = e.touches[0].clientX; else x0 = null; }, { passive: true });
  o.addEventListener("touchend", e => { if (x0 == null || !e.changedTouches.length) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1); x0 = null; });
  addEventListener("keydown", tecla); document.body.append(o); mostrar();
}

// Mosaico: 1 foto a todo el ancho · 2 lado a lado · 3 dos arriba y una abajo · 4 en cuadrícula 2×2.
// El número de cada foto es el lugar que ocupará en el mosaico de Excel (CQA CLEAN).
// fotos: [{url} | {cargar: async () => url}]  ·  opciones.editar: {quitar(i), mover(i, d)}
export function mosaico(fotos, opciones = {}) {
  const n = Math.min(fotos.length, 4), el = h("div", { class: `mosaic m${n}` + (opciones.editar ? " edit" : "") });
  fotos.slice(0, 4).forEach((f, i) => {
    const img = h("img", { alt: `Foto ${i + 1}`, loading: "lazy" });
    const tile = h("div", { class: "tile", onclick: () => !opciones.editar && visor(fotos, i) }, img, n > 1 || opciones.editar ? h("span", { class: "num" }, String(i + 1)) : null);
    if (f.url) img.src = f.url; else { tile.classList.add("wait"); f.cargar().then(u => { img.src = u; tile.classList.remove("wait"); f.url = u; }).catch(() => tile.classList.add("fail")); }
    if (opciones.editar) {
      tile.append(h("button", { type: "button", class: "q", "aria-label": "Quitar foto", onclick: () => opciones.editar.quitar(i) }, "✕"));
      if (fotos.length > 1) tile.append(h("div", { class: "mv" },
        h("button", { type: "button", "aria-label": "Mover antes", disabled: i === 0, onclick: () => opciones.editar.mover(i, -1) }, "◀"),
        h("button", { type: "button", "aria-label": "Mover después", disabled: i === fotos.length - 1, onclick: () => opciones.editar.mover(i, 1) }, "▶")));
    }
    el.append(tile);
  });
  return el;
}

export function hoja(titulo, contenido) {
  const cerrar = () => fondo.remove();
  const fondo = h("div", { class: "sheet-bg", onclick: e => { if (e.target === fondo) cerrar(); } },
    h("div", { class: "sheet", role: "dialog", "aria-label": titulo },
      h("div", { class: "sheet-head" }, h("h2", null, titulo), h("button", { class: "x", "aria-label": "Cerrar", onclick: cerrar }, "✕")), contenido));
  document.body.append(fondo); return cerrar;
}
// Confirmación propia (no usa confirm() del navegador).
export function confirmar(titulo, texto, si = "ACEPTAR", no = "CANCELAR") {
  return new Promise(res => {
    const f = v => { fondo.remove(); res(v); };
    const fondo = h("div", { class: "sheet-bg center", onclick: e => { if (e.target === fondo) f(false); } },
      h("div", { class: "dialog", role: "alertdialog", "aria-label": titulo }, h("h3", null, titulo), h("p", null, texto),
        h("div", { class: "two" }, h("button", { class: "btn", onclick: () => f(false) }, no), h("button", { class: "btn primary", onclick: () => f(true) }, si))));
    document.body.append(fondo);
  });
}
export const sel = (id, opciones, valor, vacioTxt) => h("select", { id },
  vacioTxt ? h("option", { value: "" }, vacioTxt) : null,
  opciones.map(o => h("option", { value: o.v ?? o, selected: (o.v ?? o) === valor }, o.t ?? o)));

export const montar = (...n) => document.getElementById("app").replaceChildren(...n.flat(Infinity).filter(Boolean));
export const go = hash => { location.hash = hash; };
