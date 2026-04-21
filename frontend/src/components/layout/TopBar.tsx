import { LogOut } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

const PAGE_TITLES: Record<string, string> = {
  '/intake':        'New Trip Request',
  '/queue':         'Trip Queue',
  '/dashboard':     'Dashboard',
  '/facilities':    'Facilities',
  '/requestors':    'Requestors',
  '/clients':       'Clients',
  '/pay-sources':   'Pay Sources',
  '/notifications': 'Notifications',
  '/audit':         'Audit Log',
}

export function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? 'GoTime'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0">
      <h2 className="text-sm font-semibold text-gray-700 tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden sm:block">{user?.email}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-gray-400 hover:text-gray-700 h-8 px-2.5 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
