import { useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { Category } from '../schemas'

interface UseCategoryListResult {
  isLoadingCategories: boolean
  error: string | null
  loadCategories: () => Promise<void>
}

export function useCategoryList(): UseCategoryListResult {
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setCategories = useStore((s) => s.setCategories)

  const loadCategories = async (): Promise<void> => {
    if (useStore.getState().categories.length > 0) return

    setIsLoadingCategories(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_categories')

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      const mapped: Category[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
      }))

      setCategories(mapped)
    } finally {
      setIsLoadingCategories(false)
    }
  }

  return { isLoadingCategories, error, loadCategories }
}
