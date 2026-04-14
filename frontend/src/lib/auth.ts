import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthUser, Role } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when both URL and anon key are set (typical production / integrated dev). */
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

const DEV_BYPASS_KEY = 'gotime-dev-bypass-auth'

const MOCK_ROLES: Role[] = ['intake_staff', 'senior_dispatcher', 'admin']

function parseMockRole(): Role {
  const r = import.meta.env.VITE_DEV_MOCK_ROLE?.trim()
  if (r && (MOCK_ROLES as readonly string[]).includes(r)) return r as Role
  return 'admin'
}

function getDevBypassUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  if (localStorage.getItem(DEV_BYPASS_KEY) !== '1') return null
  return {
    user_id: 'local-dev-user',
    email: 'dev@local.test',
    role: parseMockRole(),
  }
}

/** Local-only “signed in” state when Supabase env is missing (see Login dev button). */
export function enableDevBypassAuth(): void {
  localStorage.setItem(DEV_BYPASS_KEY, '1')
}

export async function signIn(email: string, password: string) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, or use “Continue with local UI” on the sign-in page (Vite dev only).',
    )
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEV_BYPASS_KEY)
  }
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const bypass = getDevBypassUser()
  if (bypass) return bypass
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    user_id: user.id,
    email: user.email ?? '',
    role: (user.user_metadata?.role ?? 'intake_staff') as Role,
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
