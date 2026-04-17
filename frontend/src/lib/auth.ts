import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthUser } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function signIn(email: string, password: string) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env',
    )
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    user_id: user.id,
    email: user.email ?? '',
    role: (user.user_metadata?.role ?? 'intake_staff') as AuthUser['role'],
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  // If token is expired or about to expire (within 60s), refresh it
  const exp = JSON.parse(atob(session.access_token.split('.')[1])).exp as number
  if (exp * 1000 < Date.now() + 60_000) {
    const { data } = await supabase.auth.refreshSession()
    return data.session?.access_token ?? null
  }

  return session.access_token
}
