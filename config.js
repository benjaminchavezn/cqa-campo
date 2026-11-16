// ============================================================
//  CONFIGURACIÓN DE CQA CAMPO  (único archivo que debes editar)
// ============================================================
// Si "clientId" está vacío, la app funciona en MODO DEMOSTRACIÓN:
// guarda todo solo en el teléfono, para que pruebes la pantalla.
// Cuando TI te entregue el ID de aplicación (ver GUIA.md, paso 1),
// pégalo aquí y la app pasa a guardar en SharePoint.
window.CQA_CONFIG = {
  clientId: "",                       // ID de aplicación (Entra ID). Vacío = demostración
  tenant: "organizations",            // o el ID/dominio de tu organización
  sharepointHost: "cleantechsac.sharepoint.com",   // <-- tu dominio de SharePoint
  sitePath: "/sites/CARAHUACRA",                     // <-- ruta del sitio
  listaTemas: "CQA_Foro_Temas",          // lista nueva (foro)
  listaReportes: "CQA_Foro_Reportes",    // lista nueva (foro)
  bibliotecaEvidencias: "CQA_Evidencias", // TU biblioteca existente: ahí van las fotos
  estadoInicial: "Pendiente",            // valor de EstadoEvidencia al subir una foto
  // Códigos EXACTOS de las columnas FrenteCodigo y AreaCodigo de CQA_Evidencias.
  frentes: [
    { codigo: "RUM", nombre: "Rumichaca" },
    { codigo: "TOL", nombre: "Toldorrumi" },
    { codigo: "GAV", nombre: "Gavilán" }
  ],
  // "hoja" = hoja del libro de Excel donde se coloca (solo la usa el complemento).
  areas: [
    { codigo: "SUP", nombre: "SUP", hoja: "QA" },        // ¿SUP corresponde a la hoja QA? confirmar
    { codigo: "LAB", nombre: "LAB", hoja: "LAB" },
    { codigo: "Opción 3", nombre: "TOPO", hoja: "TOPO" } // renombra «Opción 3» en SharePoint y aquí
  ],
  equipo: [],                         // opcional: ["Ana Pérez", "Luis Ríos"] para ver quién falta hoy
  zonaHoraria: "America/Lima"
};
