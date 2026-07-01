import { useListSlaConfig } from '@/modules/sla/hooks/useListSlaConfig'
import { useUpdateSlaConfig } from '@/modules/sla/hooks/useUpdateSlaConfig'
import { SlaInfoBanner } from '@/modules/sla/components/SlaInfoBanner'
import { SlaRulesTable } from '@/modules/sla/components/SlaRulesTable'
import type { SlaConfigChange } from '@/modules/sla/components/SlaRulesTable'
import { Spinner } from '@/ui/Spinner'

export function SlaConfigPage(): React.JSX.Element {
  const { data, isLoading, error, refetch } = useListSlaConfig()
  const { execute: updateSlaConfig, isLoading: isSaving, error: updateError } = useUpdateSlaConfig()

  // Saves each changed row sequentially (single useUpdateSlaConfig instance,
  // so calls must not overlap) and refetches once at the end, matching
  // Stitch P12's single "Guardar cambios" footer button that commits every
  // edited row in one click.
  const handleSaveAll = async (changes: SlaConfigChange[]): Promise<void> => {
    for (const change of changes) {
      const ok = await updateSlaConfig(change.categoryId, change.maxResolutionHours, change.escalationEnabled)
      if (!ok) return
    }
    void refetch()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración SLA</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administrá los tiempos máximos de resolución y el escalamiento automático por categoría.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-6">
        <SlaInfoBanner />
      </div>

      {/* Error banner — list fetch error takes precedence over a save error */}
      {(error ?? updateError) && (
        <div role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error ?? updateError}
        </div>
      )}

      {/* Rules table */}
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
