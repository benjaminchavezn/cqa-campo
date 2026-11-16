export const cfg = window.CQA_CONFIG;
export const DEMO = !cfg.clientId;

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "for") el.htmlFor = v;
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

export const nomFrente = c => (cfg.frentes.find(f => f.codigo === c) || {}).nombre || c || "";
export const nomArea = c => (cfg.areas.find(a => a.codigo === c) || {}).nombre || c || "";
export const opFrentes = () => cfg.frentes.map(f => ({ v: f.codigo, t: f.nombre }));
export const opAreas = () => cfg.areas.map(a => ({ v: a.codigo, t: a.nombre }));
// Identificador común de las fotos de un reporte: aaaammdd-FRENTE-AREA-XXXX  (cada foto agrega -1, -2…)
export function nuevaBase(fecha, frente, area) {
  const limpio = t => (t || "GEN").replace(/[^A-Za-z0-9]/g, "") || "GEN";
  return `${fecha.replaceAll("-", "")}-${limpio(frente)}-${limpio(nomArea(area))}-${Date.now().toString(36).toUpperCase()}`;
}
export const hoy = () => new Intl.DateTimeFormat("sv-SE", { timeZone: cfg.zonaHoraria }).format(new Date());

export function diaLargo(fecha) {
  if (fecha === hoy()) return "Hoy";
  const ayer = new Date(Date.now() - 864e5);
  if (fecha === new Intl.DateTimeFormat("sv-SE", { timeZone: cfg.zonaHoraria }).format(ayer)) return "Ayer";
  const [y, m, d] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "numeric", month: "short" })
    .format(new Date(y, m - 1, d));
}

export function hora(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: cfg.zonaHoraria }).format(new Date(iso));
}

export function haceCuanto(iso) {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  return `hace ${Math.round(min / 1440)} d`;
}

export function iniciales(nombre) {
  return (nombre || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

// Reduce la foto para que suba rápido con señal débil (≈200–350 KB).
export async function reducirFoto(file, max = 1600, calidad = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("No se pudo leer la foto."));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("No se pudo reducir la foto.")), "image/jpeg", calidad));
  } finally { URL.revokeObjectURL(url); }
}
