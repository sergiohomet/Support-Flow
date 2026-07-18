import { useEffect, useRef, useState } from 'react'
import { buildExcelBlob } from './excel'
import { buildMultiSectionCsv } from './csv'
import { buildExportFilename } from './filename'
import { buildPdfBlob } from './pdf'
import type { ReportSection } from './types'

interface ExportMenuProps {
  sections: ReportSection[]
  dateFrom: string
  dateTo: string
  pageSlug: string
}

const MENU_ITEM_CLASS =
  'block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50'

// Mismo idioma de descarga (blob + anchor temporal) que `ExportCsvButton`, para
// que los tres formatos se comporten de forma consistente.
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  URL.revokeObjectURL(url)
}

export function ExportMenu({
  sections,
  dateFrom,
  dateTo,
  pageSlug,
}: ExportMenuProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      buttonRef.current?.focus()
    }
  }

  const handleExportCsv = (): void => {
    const csv = buildMultiSectionCsv(sections)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, buildExportFilename(pageSlug, dateFrom, dateTo, 'csv'))
    setIsOpen(false)
  }

  const handleExportExcel = async (): Promise<void> => {
    const blob = await buildExcelBlob(sections)
    downloadBlob(blob, buildExportFilename(pageSlug, dateFrom, dateTo, 'xlsx'))
    setIsOpen(false)
  }

  const handleExportPdf = (): void => {
    const blob = buildPdfBlob(sections)
    downloadBlob(blob, buildExportFilename(pageSlug, dateFrom, dateTo, 'pdf'))
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        Exportar
        <span className="material-icons text-[18px]" aria-hidden="true">
          expand_more
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button type="button" role="menuitem" onClick={handleExportCsv} className={MENU_ITEM_CLASS}>
            CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleExportExcel()}
            className={MENU_ITEM_CLASS}
          >
            Excel
          </button>
          <button type="button" role="menuitem" onClick={handleExportPdf} className={MENU_ITEM_CLASS}>
            PDF
          </button>
        </div>
      )}
    </div>
  )
}
