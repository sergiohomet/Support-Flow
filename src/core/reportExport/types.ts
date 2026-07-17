// Modelo de datos compartido para exportar reportes a CSV, Excel y PDF.
// Cada exportador consume `ReportSection[]` sin conocer de qué página
// (Reportes, SLA) provienen los datos.
export interface ReportSection {
  title: string
  headers: string[]
  rows: (string | number)[][]
}
