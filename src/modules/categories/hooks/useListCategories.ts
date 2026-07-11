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

interface FetchResult {
  categories: Category[]
  error: string | null
}

async function fetchCategories(): Promise<FetchResult> {
  const { data, error: rpcError } = await supabase.rpc('admin_list_categories')

  if (rpcError) {
    return { categories: [], error: parseRpcError(rpcError.message) }
  }

  const rows = (data as Array<Record<string, unknown>>) ?? []
  return {
    categories: rows.map((row) => mapCategory(row as Parameters<typeof mapCategory>[0])),
    error: null,
  }
}

export function useListCategories(): UseListCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async (): Promise<void> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await fetchCategories()
      setCategories(result.categories)
      setError(result.error)
    } finally {
      setIsFetching(false)
    }
  }

  // The fetch/mapping/error-parsing logic lives in fetchCategories (a plain
  // async function, not a closure over setState) on purpose: the
  // react-hooks/set-state-in-effect rule flags any effect that calls an
  // outer function which sets state, so state updates are handled directly
  // here instead. `cancelled` guards against a stale response landing after
  // a newer request already resolved.
  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setIsFetching(true)
      setError(null)
      try {
        const result = await fetchCategories()
        if (cancelled) return
        setCategories(result.categories)
        setError(result.error)
      } finally {
        if (!cancelled) setIsFetching(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, isFetching, error, refetch }
}
