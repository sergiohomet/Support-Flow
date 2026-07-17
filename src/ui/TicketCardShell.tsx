interface TicketCardShellProps {
  id: string
  title: string
  description?: string
  badges?: React.ReactNode
  meta?: React.ReactNode
  onClick?: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

const BASE_CLASSES = 'bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2'

export function TicketCardShell({
  id,
  title,
  description,
  badges,
  meta,
  onClick,
  children,
  footer,
}: TicketCardShellProps): React.JSX.Element {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-gray-400">#{id.slice(0, 8)}</span>
        {badges && <div className="flex items-center gap-2 shrink-0">{badges}</div>}
      </div>

      <p className="text-blue-700 font-medium leading-snug">{title}</p>

      {description && <p className="text-sm text-gray-600 line-clamp-2">{description}</p>}

      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2">
          {meta}
          {onClick && <span className="text-xs text-blue-600 font-medium">Ver detalle →</span>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>

      {footer}
    </>
  )

  if (onClick) {
    // Los botones de acción anidados (por ejemplo, "Resolver"/"Devolver al
    // pool" de AssignedTicketCard) viven dentro de esta área clickeable, por
    // lo que esto debe ser un <div role="button">, no un <button> nativo — un
    // <button> no puede contener <button> anidados como hijos (HTML
    // inválido). Los llamadores configuran `event.stopPropagation()` en sus
    // propios botones anidados; este guard solo protege el camino del
    // teclado: un keydown en un botón anidado sigue burbujeando hasta acá
    // aunque su propio click esté detenido, así que ignoramos los keydowns
    // que no se originaron en este elemento en sí.
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={`${BASE_CLASSES} text-left hover:shadow-md transition-shadow cursor-pointer`}
      >
        {body}
      </div>
    )
  }

  return <div className={BASE_CLASSES}>{body}</div>
}
