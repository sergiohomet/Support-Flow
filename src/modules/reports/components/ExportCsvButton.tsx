import { buildCsv } from './csv'

interface ExportCsvButtonProps {
  filename: string
  headers: string[]
  rows: (string | number)[][]
  label?: string
}

export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = 'Exportar CSV',
}: ExportCsvButtonProps): React.JSX.Element {
  const handleClick = (): void => {
    const csv = buildCsv(headers, rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()

    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      <span className="material-icons text-[18px]" aria-hidden="true">
        download
      </span>
      {label}
    </button>
  )
}
