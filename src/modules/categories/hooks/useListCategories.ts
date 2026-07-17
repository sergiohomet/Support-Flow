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

  // La lógica de fetch/mapeo/parseo de errores vive intencionalmente en
  // fetchCategories (una función async plana, no un closure sobre setState):
  // la regla react-hooks/set-state-in-effect marca cualquier efecto que llame
  // a una función externa que setee estado, por eso las actualizaciones de
  // estado se manejan directamente acá. `cancelled` evita que una respuesta
  // desactualizada se aplique después de que ya se resolvió una petición más nueva.
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
