// Trunca `dateFrom`/`dateTo` (strings ISO de `toISOString()`) a los primeros
// 10 caracteres (`yyyy-mm-dd`). Deliberadamente NO usa `formatDateOnly`
// (dd/mm/yyyy) porque las barras no son válidas en nombres de archivo.
export function buildExportFilename(
  pageSlug: string,
  dateFrom: string,
  dateTo: string,
  ext: 'csv' | 'xlsx' | 'pdf'
): string {
  return `${pageSlug}_${dateFrom.slice(0, 10)}_${dateTo.slice(0, 10)}.${ext}`
}
