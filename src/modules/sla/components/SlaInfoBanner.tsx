export function SlaInfoBanner(): React.JSX.Element {
  return (
    <div className="flex gap-4 items-start rounded-md border-l-4 border-blue-600 bg-blue-50 p-4">
      <span className="material-icons text-blue-600 mt-0.5" aria-hidden="true">
        info
      </span>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Información Importante</h3>
        <p className="text-sm text-gray-700">
          Cuando un ticket supera el tiempo límite su prioridad escala automáticamente a Crítica y
          se notifica a todos los administradores.
        </p>
      </div>
    </div>
  )
}
