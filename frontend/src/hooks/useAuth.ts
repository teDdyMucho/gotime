import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth'
import type { AuthUser, Role } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // onAuthStateChange fires immediately with INITIAL_SESSION —
    // no need for a separate getUser() call or timeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          user_id: session.user.id,
          email: session.user.email ?? '',
          role: (session.user.user_metadata?.role ?? 'intake_staff') as Role,
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
