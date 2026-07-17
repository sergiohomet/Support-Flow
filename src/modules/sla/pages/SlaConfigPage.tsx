import { useListSlaConfig } from '@/modules/sla/hooks/useListSlaConfig'
import { useUpdateSlaConfig } from '@/modules/sla/hooks/useUpdateSlaConfig'
import { SlaInfoBanner } from '@/modules/sla/components/SlaInfoBanner'
import { SlaRulesTable } from '@/modules/sla/components/SlaRulesTable'
import type { SlaConfigChange } from '@/modules/sla/components/SlaRulesTable'
import { Spinner } from '@/ui/Spinner'

export function SlaConfigPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useListSlaConfig()
  const { execute: updateSlaConfig, isLoading: isSaving, error: updateError } = useUpdateSlaConfig()

  // Guarda cada fila modificada de forma secuencial (una única instancia de useUpdateSlaConfig,
  // por lo que las llamadas no deben solaparse) y vuelve a hacer fetch una sola vez al final, en línea con
  // el botón único "Guardar cambios" del pie de página de Stitch P12, que confirma cada
  // fila editada en un solo click.
  const handleSaveAll = async (changes: SlaConfigChange[]): Promise<void> => {
    for (const change of changes) {
      const ok = await updateSlaConfig(change.categoryId, change.maxResolutionHours, change.escalationEnabled)
      if (!ok) return
    }
    void refetch()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración SLA</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administrá los tiempos máximos de resolución y el escalamiento automático por categoría.
        </p>
      </div>

      {/* Banner informativo */}
      <div className="mb-6">
        <SlaInfoBanner />
      </div>

      {/* Banner de error — el error de fetch de la lista tiene precedencia sobre un error de guardado */}
      {(error ?? updateError) && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error ?? updateError}
        </div>
      )}

      {/* Tabla de reglas */}
      {isLoading && data.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <SlaRulesTable rows={data} onSaveAll={(changes) => void handleSaveAll(changes)} isSaving={isSaving} />
      )}
    </div>
  )
}
