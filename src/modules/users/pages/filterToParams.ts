import type { CombinedFilter } from '@/modules/users/components/UserFilters'
import type { UserRole } from '@/modules/users/schemas'

export function filterToParams(f: CombinedFilter): { role: UserRole | null; isActive: boolean | null } {
  if (f === 'admin') return { role: 'admin', isActive: null }
  if (f === 'agent') return { role: 'agent', isActive: null }
  if (f === 'client') return { role: 'client', isActive: null }
  if (f === 'inactive') return { role: null, isActive: false }
  return { role: null, isActive: null } // '' y 'all' → sin filtro de rol/estado
}
