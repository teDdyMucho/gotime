import { LogOut, Bell } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/intake':        { title: 'New Trip Request',  sub: 'Create a new transport request' },
  '/queue':         { title: 'Trip Queue',         sub: 'Manage and review all trips' },
  '/dashboard':     { title: 'Dashboard',          sub: 'Operations overview & analytics' },
  '/facilities':    { title: 'Facilities',         sub: 'Manage facility records' },
  '/requestors':    { title: 'Requestors',         sub: 'Manage requestor contacts' },
  '/clients':       { title: 'Clients',            sub: 'Manage client records' },
  '/pay-sources':   { title: 'Pay Sources',        sub: 'Manage billing & pay sources' },
  '/notifications': { title: 'Notifications',      sub: 'Notification delivery log' },
  '/audit':         { title: 'Audit Log',          sub: 'System activity trail' },
}

export function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const page = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? { title: 'GoTime', sub: '' }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 gap-4">
      {/* Left — page title */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">{page.title}</h1>
        {page.sub && <p className="text-[11px] text-gray-400 leading-tight mt-0.5 hidden sm:block">{page.sub}</p>}
      </div>

      {/* Right — user area */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Avatar + info */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-default">
          <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-bold text-white">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate leading-tight">{user?.email}</p>
            <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-200 hidden sm:block" />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
