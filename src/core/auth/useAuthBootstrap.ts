import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/core/supabase/client'
import { useStore } from '@/store'
import type { AuthUser } from '@/store/authSlice'

async function loadProfile(): Promise<AuthUser | null> {
  const { data, error } = await supabase.rpc('get_my_profile')
  if (error || !data?.[0]) return null
  const p = data[0]
  if (p.is_active === false) {
    await supabase.auth.signOut()
    return null
  }
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    category_id: p.category_id,
    category_name: p.category_name,
  }
}

// Inicializa el estado de autenticación al cargar la app: restablece la
// sesión al montar, mantiene el store sincronizado con los eventos de auth
// de Supabase, y redirige al flujo de recuperación de contraseña cuando
// Supabase dispara PASSWORD_RECOVERY.
export function useAuthBootstrap(): void {
  const setUser = useStore((s) => s.setUser)
  const setAuthReady = useStore((s) => s.setAuthReady)
  const navigate = useNavigate()

  useEffect(() => {
    // Montaje: maneja el recargado de página — carga el perfil si existe una sesión válida
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          const profile = await loadProfile()
          setUser(profile)
        } else {
          setUser(null)
        }
      } finally {
        setAuthReady(true)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const profile = await loadProfile()
        setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'PASSWORD_RECOVERY') {
        navigate('/forgot-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setAuthReady, navigate])
}
