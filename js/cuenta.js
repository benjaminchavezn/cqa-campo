// Perfil, preferencias, actividad y administración.
import { DEMO, h, hoy, area, nomArea, fechaDMA, diaLargo, haceCuanto, iniciales, usuarioDe, csv, descargar } from "./util.js";
import { AREAS, CARGOS, EMPRESAS, ROLES, ESTADOS_COLAB, P } from "./catalogos.js";
import { salir } from "./auth.js";
import { toast, etiqueta, vacio, sel, confirmar } from "./ui.js";
import { B, S, esAdmin, soyYo, colabDe, respDe, supervisa } from "./estado.js";

const dl = pares => h("dl", { class: "kv" }, pares.filter(Boolean).flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)]));

export async function sitioPreparar(log, despues) {
  log.hidden = false; log.textContent = "Preparando…\n";
  if (!B.prepararSitio) { log.textContent += "No aplica en la demostración."; return; }
  try { await B.prepararSitio(m => { log.textContent += m + "\n"; }); log.textContent += "Listo."; if (despues) despues(); }
  catch (e) { log.textContent += "✖ " + e.message; }
}

function estadisticas(email) {
  const mias = S.temas.filter(t => t.autorEmail === email && t.tipo !== "Tema general");
  const rs = S.resps.filter(r => r.autorEmail === email && !r.oculta), ids = new Set(mias.map(t => t.id));
  const porArea = {}; mias.forEach(t => { porArea[t.area] = (porArea[t.area] || 0) + 1; });
  return {
    dias: new Set(mias.map(t => t.fecha)).size, reportes: mias.length, mias,
    fotos: mias.reduce((s, t) => s + (t.nfotos || 0), 0) + rs.reduce((s, r) => s + r.adjuntos.filter(a => a.t === "foto").length, 0),
    escritas: rs.filter(r => r.texto).length, refuerzos: rs.filter(r => r.kind === "Refuerzo").length,
    obsRecibidas: S.resps.filter(r => r.kind === "Observación" && !r.oculta && ids.has(r.temaId)).length,
    levantadas: rs.filter(r => r.kind === "Levantamiento").length,
    pendientes: soyYo(email) ? S.pend.filter(p => p.kind === "reporte").length : 0, porArea };
}

export function vistaPerfil(ctx, email) {
  const propio = !email || soyYo(email), c = propio ? S.perfil : colabDe(email);
  if (!c) return ctx.montar(vacio("👤", "Perfil no disponible", "Este colaborador no está registrado.", h("a", { class: "btn", href: "#inicio" }, "Volver")));
  const e = estadisticas(c.email);
  ctx.montar(h("div", { class: "perfil card" }, h("div", { class: "avatar" }, iniciales(c.nombre)), h("h2", { style: { margin: 0 } }, c.nombre),
      dl([["Cargo", c.cargo], ["Empresa", c.empresa === "Otros" && c.empresaOtros ? c.empresaOtros : c.empresa], ["Áreas", c.areas.map(nomArea).join(", ") || "—"], ["Registrado", c.registrado ? fechaDMA(c.registrado) : ""]]),
      propio ? h("a", { class: "btn", href: "#config" }, "⚙ PREFERENCIAS") : null),
    h("div", { class: "card" }, h("h3", null, "ESTADÍSTICAS"), h("div", { class: "stats" }, [
      [e.dias, "días con reportes"], [e.reportes, "reportes publicados"], [e.fotos, "fotografías aportadas"], [e.escritas, "respuestas escritas"], [e.refuerzos, "refuerzos a compañeros"],
      [e.obsRecibidas, "observaciones recibidas"], [e.levantadas, "observaciones levantadas"], propio ? [e.pendientes, "reportes pendientes"] : null].filter(Boolean).map(([n, t]) => h("div", null, h("b", null, String(n)), t)))),
    Object.keys(e.porArea).length ? h("div", { class: "card" }, h("h3", null, "POR ÁREA"), ...Object.entries(e.porArea).map(([a, n]) => h("div", { class: "row", style: { padding: "6px 0" } }, h("span", null, h("span", { class: "tag area", style: { background: area(a).color } }, area(a).abrev), " ", nomArea(a)), h("strong", null, String(n))))) : null,
    e.mias.length ? h("div", { class: "card" }, h("h3", null, "ÚLTIMOS REPORTES"), ...e.mias.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5).map(t => h("a", { class: "adj", href: `#tema-${t.id}` }, `${t.titulo} · ${diaLargo(t.fecha)}`))) : null);
}

export function vistaActividad(ctx) {
  const mios = S.temas.filter(t => soyYo(t.autorEmail)).map(t => ({ f: t.creado, t: "Reporte", x: t.titulo, id: t.id, a: t.area }));
  const mias = S.resps.filter(r => soyYo(r.autorEmail) && !r.oculta).map(r => { const t = S.temas.find(x => x.id === r.temaId); return { f: r.creado, t: r.kind, x: r.texto || "(adjunto)", id: r.temaId, a: t?.area }; });
  const l = [...mios, ...mias].sort((a, b) => b.f.localeCompare(a.f));
  ctx.montar(h("h2", null, "Actividad"), h("div", { class: "list" }, l.length ? l.map(a => h("a", { class: "card", href: `#tema-${a.id}` }, h("div", { class: "row" }, h("strong", null, a.t), h("span", { class: "meta" }, `hace ${haceCuanto(a.f)}`)),
    h("div", { class: "meta" }, `${nomArea(a.a)} · ${a.x.slice(0, 80)}`))) : [vacio("≡", "Sin actividad", "Aquí verás tus reportes y respuestas.")]));
}

export function vistaConfig(ctx) {
  const tab = location.hash === "#config-seguridad" ? "seg" : "cuenta", p = S.perfil;
  const tabs = h("div", { class: "tabs" }, h("a", { class: "btn" + (tab === "cuenta" ? " primary" : ""), href: "#config" }, "CUENTA"), h("a", { class: "btn" + (tab === "seg" ? " primary" : ""), href: "#config-seguridad" }, "SEGURIDAD"));
  if (tab === "seg") {
    return ctx.montar(h("a", { class: "back", href: "#perfil" }, "‹ Resumen"), tabs, h("div", { class: "card" }, h("h3", null, "Acceso"),
        h("p", null, "Tu cuenta se activa con tu cuenta de la empresa (Microsoft). La app no guarda ni pide contraseñas propias."), h("p", { class: "meta" }, S.yo.email)),
      h("div", { class: "card" }, h("h3", null, "Cerrar sesión"), h("p", { class: "meta" }, "Para volver a entrar iniciarás sesión otra vez."),
        h("button", { class: "btn bad", onclick: async () => { if (S.pend.length) return toast("Tienes envíos pendientes."); if (DEMO) return toast("En la demostración no hay sesión."); if (await confirmar("Cerrar sesión", "Se cerrará la sesión en este celular.", "CERRAR SESIÓN")) salir(); } }, "CERRAR SESIÓN")),
      h("div", { class: "card" }, h("h3", null, "¿Perdiste tu celular?"), h("a", { class: "btn", href: `https://wa.me/${P.soporte}?text=${encodeURIComponent("Perdí mi celular. Necesito cerrar mi sesión en CQA Campo.")}`, target: "_blank", rel: "noopener" }, "AVISAR POR WHATSAPP")));
  }
  const tema = (() => { try { return localStorage.getItem("cqa_tema") || "sistema"; } catch { return "sistema"; } })();
  const datos = (() => { try { return !!JSON.parse(localStorage.getItem("cqa_datos")); } catch { return false; } })();
  const f = h("form", { class: "form" }, h("div", { class: "card" }, dl([["Usuario", usuarioDe(p.nombres, p.apellidos)], ["Celular (WhatsApp)", p.celular || "—"]]), h("p", { class: "meta" }, "Tus datos los cambia la administración. Tu celular no se muestra a tus compañeros.")),
    h("div", null, h("strong", null, "Tema"), h("div", { style: { display: "grid", gap: "8px", marginTop: "6px" } }, [["claro", "Claro"], ["oscuro", "Oscuro"], ["sistema", "Sistema"]].map(([v, t]) => h("label", { class: "opt" }, h("input", { type: "radio", name: "tm", value: v, checked: tema === v }), t)))),
    h("div", null, h("strong", null, "Envío de fotos y videos"), h("label", { class: "opt", style: { marginTop: "6px" } }, h("input", { type: "checkbox", id: "dm", checked: datos }), "Enviar con datos móviles sin preguntar")),
    h("button", { type: "button", class: "btn", onclick: () => {
      const f2 = [["Fecha", "Área", "Título", "Descripción", "Fotos", "Estado"], ...S.temas.filter(t => soyYo(t.autorEmail)).map(t => [t.fecha, nomArea(t.area), t.titulo, t.descripcion, t.nfotos, t.estado])];
      descargar("mis-reportes.csv", csv(f2));
    } }, "⬇ DESCARGAR MIS REPORTES"), h("button", { class: "btn primary big", type: "submit" }, "GUARDAR CAMBIOS"));
  f.onsubmit = e => {
    e.preventDefault(); const t = f.querySelector("input[name=tm]:checked").value;
    try { localStorage.setItem("cqa_tema", t); localStorage.setItem("cqa_datos", JSON.stringify(f.dm.checked)); } catch { /* sin almacenamiento */ }
    if (t === "sistema") delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = t;
    toast("Cambios guardados");
  };
  ctx.montar(h("a", { class: "back", href: "#perfil" }, "‹ Resumen"), tabs, f);
}

/* ---------- administración ---------- */
export function vistaAdmin(ctx) {
  if (!esAdmin()) return ctx.montar(vacio("🔒", "Solo administradores", "No tienes permiso para esta sección."));
  const hoyN = S.temas.filter(t => t.fecha === hoy() && t.tipo !== "Tema general");
  const porArea = AREAS.map(a => `${a.abrev} ${hoyN.filter(t => t.area === a.codigo).length}`).join(" · ");
  const activos = S.colabs.filter(c => c.estado === "Activo");
  const log = h("pre", { class: "log", hidden: true });
  const lista = h("div", { class: "list" });
  let q = "", fc = "", fa = "", fe = "Activo";
  const pintar = () => {
    const r = S.colabs.filter(c => (!fe || c.estado === fe) && (!fc || c.cargo === fc) && (!fa || c.areas.includes(fa)) && (!q || `${c.nombre} ${c.dni} ${c.celular} ${c.email}`.toLowerCase().includes(q)));
    lista.replaceChildren(...(r.length ? r.map(c => h("a", { class: "card", href: `#admin-${c.id}` }, h("div", { class: "row" }, h("strong", null, `${c.apellidos}, ${c.nombres}`), etiqueta(c.estado, c.estado === "Activo" ? "ok" : "amber")),
      h("div", { class: "meta" }, `${c.cargo} · ${c.empresa}`), h("div", { class: "tags" }, c.areas.length ? c.areas.map(a => h("span", { class: "tag area", style: { background: area(a).color } }, area(a).abrev)) : etiqueta("Sin área", "bad")))) : [vacio("👥", "Sin resultados", "Cambia los filtros o registra un colaborador.")]));
  };
  ctx.montar(h("h2", null, "Administración"),
    h("div", { class: "kpi" }, h("div", null, h("b", null, String(activos.length)), "colaboradores activos"), h("div", null, h("b", null, String(S.colabs.filter(c => !c.areas.length && c.estado === "Activo").length)), "sin área (no pueden reportar)"),
      h("div", null, h("b", null, String(hoyN.length)), "reportes hoy"), h("div", null, h("b", null, String(S.temas.filter(t => t.estado === "Observado").length)), "temas observados")),
    h("p", { class: "meta" }, "Hoy por área: " + porArea),
    h("a", { class: "btn primary", href: "#admin-nuevo" }, "+ NUEVO COLABORADOR"), h("div", { style: { height: "10px" } }),
    h("div", { class: "form" }, h("input", { type: "search", placeholder: "Buscar nombre, DNI, celular o correo", oninput: e => { q = e.target.value.toLowerCase(); pintar(); } }),
      h("div", { class: "two" }, h("select", { "aria-label": "Cargo", onchange: e => { fc = e.target.value; pintar(); } }, h("option", { value: "" }, "Cargo: todos"), CARGOS.map(c => h("option", null, c.n))),
        h("select", { "aria-label": "Área", onchange: e => { fa = e.target.value; pintar(); } }, h("option", { value: "" }, "Área: todas"), AREAS.map(a => h("option", { value: a.codigo }, a.nombre)))),
      h("select", { "aria-label": "Estado", onchange: e => { fe = e.target.value; pintar(); } }, h("option", { value: "" }, "Estado: todos"), ESTADOS_COLAB.map(s => h("option", { selected: s === "Activo" }, s)))),
    h("div", { style: { height: "10px" } }), lista,
    h("div", { class: "card", style: { marginTop: "14px" } }, h("h3", null, "Sitio de SharePoint"), h("p", { class: "meta" }, "Crea o completa las listas del foro, de colaboradores y la biblioteca de adjuntos. No modifica CQA_Evidencias."),
      h("button", { class: "btn", onclick: () => sitioPreparar(log) }, "Preparar sitio de SharePoint"), log));
  pintar();
}

export function vistaFicha(ctx, id) {
  if (!esAdmin()) return ctx.montar(vacio("🔒", "Solo administradores", ""));
  const nuevo = id === "nuevo", c = nuevo ? { email: "", nombres: "", apellidos: "", dni: "", celular: "", cargo: CARGOS[3].n, empresa: EMPRESAS[0], empresaOtros: "", areas: [], grupo: "", rol: "Colaborador", estado: "Activo", registrado: hoy(), historial: "" } : S.colabs.find(x => x.id === id);
  if (!c) return ctx.montar(vacio("👤", "Colaborador no encontrado", "", h("a", { class: "btn", href: "#admin" }, "Volver")));
  const inp = (k, t, extra = {}) => h("label", null, t, h("input", { id: k, value: c[k] || "", ...extra }));
  const checks = AREAS.map(a => h("label", { class: "opt" }, h("input", { type: "checkbox", value: a.codigo, checked: c.areas.includes(a.codigo) }), h("span", { class: "tag area", style: { background: a.color } }, a.abrev), a.nombre));
  const emp = sel("empresa", EMPRESAS, c.empresa), otros = h("input", { id: "empresaOtros", value: c.empresaOtros || "", placeholder: "Empresa (especificar)" });
  const f = h("form", { class: "form" }, h("a", { class: "back", href: "#admin" }, "‹ Colaboradores"), h("h2", null, nuevo ? "Nuevo colaborador" : c.nombre),
    inp("nombres", "Nombres", { required: true }), inp("apellidos", "Apellidos", { required: true }),
    inp("email", "Correo de la cuenta Microsoft", { type: "email", required: true, disabled: !nuevo, placeholder: "nombre@empresa.com" }),
    inp("dni", "DNI", { inputMode: "numeric", maxLength: 8 }), inp("celular", "Celular (WhatsApp)", { type: "tel", placeholder: "+51 9" }),
    h("label", null, "Cargo", sel("cargo", CARGOS.map(x => x.n), c.cargo)), h("label", null, "Empresa", emp), otros, inp("grupo", "Grupo / cuadrilla"),
    h("div", { class: "two" }, h("label", null, "Rol", sel("rol", ROLES, c.rol)), h("label", null, "Estado", sel("estado", ESTADOS_COLAB, c.estado))),
    h("div", null, h("strong", null, "Áreas asignadas (una o varias)"), h("div", { style: { display: "grid", gap: "8px", marginTop: "6px" } }, checks)),
    h("label", null, "Motivo del cambio", h("input", { id: "motivo", placeholder: nuevo ? "Alta" : "Obligatorio al cambiar cargo, empresa o áreas" })),
    h("button", { class: "btn primary big", type: "submit" }, "GUARDAR CAMBIOS"));
  const sync = () => { otros.hidden = emp.value !== "Otros"; }; emp.onchange = sync; sync();
  const link = typeof location !== "undefined" ? location.origin + location.pathname : "";
  const mensaje = () => `CQA Campo — Invitación\nHola ${c.nombres} ${c.apellidos},\nfuiste registrado como ${c.cargo} (${c.empresa}).\nÁreas asignadas: ${c.areas.map(nomArea).join(", ") || "—"}.\n1) Abre este enlace: ${link}\n2) Inicia sesión con tu cuenta Microsoft: ${c.email}\n3) Instala la app en tu pantalla de inicio.\nAyuda: ${P.soporteTxt}`;
  f.onsubmit = async e => {
    e.preventDefault();
    const areas = checks.map(l => l.querySelector("input")).filter(i => i.checked).map(i => i.value);
    if (f.estado.value === "Activo" && !areas.length) return toast("Asigna al menos un área para activar al colaborador.");
    const cambios = !nuevo && (f.cargo.value !== c.cargo || f.empresa.value !== c.empresa || areas.join() !== c.areas.join());
    if (cambios && !f.motivo.value.trim()) return toast("Indica el motivo del cambio.");
    const reg = { ...c, nombres: f.nombres.value.trim(), apellidos: f.apellidos.value.trim(), email: (nuevo ? f.email.value : c.email).trim().toLowerCase(), dni: f.dni.value.trim(), celular: f.celular.value.trim(),
      cargo: f.cargo.value, empresa: f.empresa.value, empresaOtros: f.empresa.value === "Otros" ? f.empresaOtros.value.trim() : "", grupo: f.grupo.value.trim(), rol: f.rol.value, estado: f.estado.value, areas };
    if (nuevo && S.colabs.some(x => x.email === reg.email)) return toast("Ese correo ya está registrado.");
    const b = f.querySelector("button[type=submit]"); b.disabled = true;
    try {
      await B.saveColaborador(reg, cambios || nuevo ? `${S.yo.nombre || "admin"}: ${nuevo ? "alta" : `cargo ${c.cargo}→${reg.cargo}; áreas ${c.areas.join(";") || "-"}→${areas.join(";")}`} · ${f.motivo.value.trim() || "alta"}` : "");
      S.cargado = false; await ctx.cargar(true); toast("Guardado ✔"); ctx.go("#admin");
    } catch (er) { toast("No se pudo guardar: " + er.message, 6000); b.disabled = false; }
  };
  const inv = nuevo ? null : h("div", { class: "card" }, h("h3", null, "Invitación por WhatsApp"), h("p", { class: "meta" }, "El colaborador entra con su cuenta Microsoft; no necesita códigos."),
    h("button", { class: "btn", onclick: async () => { try { await navigator.clipboard.writeText(mensaje()); toast("Mensaje copiado"); } catch { toast("No se pudo copiar."); } } }, "COPIAR MENSAJE"),
    h("a", { class: "btn", href: `https://wa.me/${(c.celular || "").replace(/\D/g, "")}?text=${encodeURIComponent(mensaje())}`, target: "_blank", rel: "noopener" }, "ABRIR EN WHATSAPP"));
  ctx.montar(f, inv, !nuevo && c.historial ? h("div", { class: "card" }, h("h3", null, "Historial"), h("pre", { class: "meta", style: { whiteSpace: "pre-wrap" } }, c.historial)) : null);
}
