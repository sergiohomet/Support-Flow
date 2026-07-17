import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { Category } from '../schemas'

interface UseCategoryListResult {
  isLoadingCategories: boolean
  error: string | null
  loadCategories: () => Promise<void>
}

interface FetchResult {
  categories: Category[]
  error: string | null
}

async function fetchCategories(): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('get_categories')

  if (rpcError) {
    return { categories: [], error: rpcError.message }
  }

  const mapped: Category[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
  }))

  return { categories: mapped, error: null }
}

// Todo consumidor de este hook quiere lo mismo al montarse — las categorías
// cargadas en el store compartido, obtenidas una sola vez y cacheadas — por eso el efecto
// vive acá en lugar de estar duplicado en cada página que lo necesita.
export function useCategoryList(): UseCategoryListResult {
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setCategories = useStore((s) => s.setCategories)

  const loadCategories = async (): Promise<void> => {
    if (useStore.getState().categories.length > 0) return

    setIsLoadingCategories(true)
    setError(null)
    try {
      const result = await fetchCategories()
      if (result.error) {
        setError(result.error)
        return
      }
      setCategories(result.categories)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (useStore.getState().categories.length > 0) return

    let cancelled = false

    async function run(): Promise<void> {
      setIsLoadingCategories(true)
      setError(null)
      try {
        const result = await fetchCategories()
        if (cancelled) return
        if (result.error) {
          setError(result.error)
          return
        }
        setCategories(result.categories)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setIsLoadingCategories(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [setCategories])

  return { isLoadingCategories, error, loadCategories }
}
