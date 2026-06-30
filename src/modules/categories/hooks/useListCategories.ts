import { useEffect, useState } from 'react'
import { supabase } from '@/core/supabase/client'
import { parseRpcError } from '@/core/utils/parseRpcError'
import { mapCategory } from '../schemas'
import type { Category } from '../schemas'

interface UseListCategoriesResult {
  categories: Category[]
  isFetching: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useListCategories(): UseListCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_categories')

      if (rpcError) {
        setError(parseRpcError(rpcError.message))
        return
      }

      const rows = (data as Array<Record<string, unknown>>) ?? []
      setCategories(rows.map((row) => mapCategory(row as Parameters<typeof mapCategory>[0])))
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { categories, isFetching, error, refetch: fetchCategories }
}
