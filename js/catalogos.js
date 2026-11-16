// Catálogos del diseño v1.2. Cambiar aquí si aparece un área, cargo o empresa nueva.
export const AREAS = [
  { codigo: "GAV", nombre: "Tajo Gavilán", abrev: "GAV", color: "#1d6fd1" },
  { codigo: "TOL", nombre: "Tajo Toldorrumi", abrev: "TOL", color: "#1f8a4c" },
  { codigo: "RUM", nombre: "Relavera Rumichaca", abrev: "RUM", color: "#e8710a" },
  { codigo: "ESC", nombre: "Escolleras", abrev: "ESC", color: "#7b3fc4" },
  { codigo: "CDS", nombre: "Cancha de Secado", abrev: "CDS", color: "#8d5a2b" },
  { codigo: "OTR", nombre: "Otros", abrev: "OTR", color: "#6b7785" }
];
// esp = valor de AreaCodigo en CQA_Evidencias (la especialidad la define el cargo). "" = sin especialidad.
export const CARGOS = [
  { n: "Topógrafo", esp: "Opción 3" },
  { n: "Técnico de laboratorio", esp: "LAB" },
  { n: "Jefe de laboratorio", esp: "LAB" },
  { n: "Supervisor QA", esp: "SUP" },
  { n: "Jefe de servicio", esp: "SUP" },
  { n: "Ayudante de laboratorio", esp: "LAB" },
  { n: "Conductor", esp: "" }
];
export const ESP_CORTO = { SUP: "SUP", LAB: "LAB", "Opción 3": "TOPO" };
export const EMPRESAS = ["Clean Technology", "Ecosermy", "Ecosempo", "Volcan", "Otros"];
export const ROLES = ["Colaborador", "Supervisor", "Administrador"];
export const ESTADOS_COLAB = ["Pendiente", "Activo", "Suspendido", "Baja"];
export const SUPERVISAN = ["Jefe de servicio", "Supervisor QA", "Jefe de laboratorio"];
export const P = {
  maxFotos: 4, dpi: 220, ancho: 780, alto: 585, videoSeg: 30, videoMB: 40, pdfMB: 10, editarMin: 15,
  soporte: "51949618585", soporteTxt: "+51 949 618 585"
};
