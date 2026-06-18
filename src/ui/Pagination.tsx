interface PaginationProps {
  currentPage: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  className,
}: PaginationProps): React.JSX.Element | null {
  const totalPages = Math.ceil(totalCount / pageSize)

  if (totalPages <= 1) return null

  const buttonClass =
    'px-3 py-1.5 text-sm rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors'

  return (
    <div
      className={['flex items-center justify-between', className].filter(Boolean).join(' ')}
      aria-label="Paginación"
    >
      <button
        type="button"
        className={buttonClass}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Página anterior"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-600">
        Página {currentPage} de {totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Página siguiente"
      >
        Siguiente
      </button>
    </div>
  )
}
