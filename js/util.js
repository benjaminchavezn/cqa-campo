import { AREAS, CARGOS, ESP_CORTO, P } from "./catalogos.js";
export const cfg = Object.assign({ listaRespuestas: "CQA_Foro_Respuestas", listaColaboradores: "CQA_Colaboradores",
  bibliotecaAdjuntos: "CQA_Adjuntos", estadoInicial: "Pendiente", zonaHoraria: "America/Lima" }, window.CQA_CONFIG);
export const DEMO = !cfg.clientId;

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "for") el.htmlFor = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el) el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const area = c => AREAS.find(a => a.codigo === c) || { codigo: c, nombre: c || "—", abrev: c || "—", color: "#6b7785" };
export const nomArea = c => area(c).nombre;
export const espDeCargo = cargo => (CARGOS.find(x => x.n === cargo) || {}).esp || "";
// Identificador común de las fotos de un reporte: aaaammdd-AREA-ESP-XXXX (cada foto agrega -1, -2…)
export function nuevaBase(fecha, areaCod, esp) {
  const limpio = t => (t || "GEN").replace(/[^A-Za-z0-9]/g, "") || "GEN";
  return `${fecha.replaceAll("-", "")}-${limpio(areaCod)}-${limpio(ESP_CORTO[esp] || esp || "GEN")}-${Date.now().toString(36).toUpperCase()}`;
}
export const hoy = (delta = 0) => new Intl.DateTimeFormat("sv-SE", { timeZone: cfg.zonaHoraria }).format(new Date(Date.now() + delta * 864e5));

function fechaCorta(f) { const [, m, d] = f.split("-"); return `${d}/${m}`; }
export const fechaDMA = f => { const [y, m, d] = f.split("-"); return `${d}/${m}/${y}`; };
export function diaLargo(fecha) {
  if (fecha === hoy()) return `Hoy ${fechaCorta(fecha)}`;
  if (fecha === hoy(-1)) return `Ayer ${fechaCorta(fecha)}`;
  const [y, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}
export function hora(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: cfg.zonaHoraria }).format(new Date(iso));
}
export function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
}
export const iniciales = n => (n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
export const nombreCorto = n => { const p = (n || "").split(/\s+/).filter(Boolean); return p.length > 1 ? `${p[0][0]}. ${p[1]}` : n || "—"; };
export const usuarioDe = (nom, ape) => "@" + `${nom || ""}.${(ape || "").split(/\s+/)[0] || ""}`.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z.]/g, "").replace(/^\.|\.$/g, "");

// Reduce la foto a la medida de la celda del mosaico (780 × 585 px = 9,0 × 6,75 cm a 220 dpi), JPEG 80 %.
export async function reducirFoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("No se pudo leer la foto.")); i.src = url;
    });
    const vertical = img.naturalHeight > img.naturalWidth;
    const [mw, mh] = vertical ? [P.alto, P.ancho] : [P.ancho, P.alto];
    const k = Math.min(1, mw / img.naturalWidth, mh / img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("No se pudo reducir la foto.")), "image/jpeg", 0.8));
    return await conDpi(blob, P.dpi);
  } finally { URL.revokeObjectURL(url); }
}
// Escribe 220 dpi en la cabecera JFIF del JPEG.
async function conDpi(blob, dpi) {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b[3] === 0xe0 && b[6] === 0x4a && b[7] === 0x46) {
    b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255;
    return new Blob([b], { type: "image/jpeg" });
  }
  return blob;
}
export function csv(filas) {
  const e = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return "﻿" + filas.map(f => f.map(e).join(",")).join("\r\n");
}
export function descargar(nombre, texto, tipo = "text/csv;charset=utf-8") {
  const a = h("a", { href: URL.createObjectURL(new Blob([texto], { type: tipo })), download: nombre });
  document.body.append(a); a.click(); a.remove();
}
