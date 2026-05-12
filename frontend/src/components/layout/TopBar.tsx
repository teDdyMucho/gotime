import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, Settings, Shield, ChevronDown, X, UserCircle } from 'lucide-react'

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

type SettingsTab = 'account'

const SETTINGS_NAV: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: 'account', label: 'Account', icon: UserCircle },
]

export function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const page = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? { title: 'GoTime', sub: '' }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 gap-4">
        {/* Left — page title */}
        <div className="min-w-0">
          <h1 className="text-base font-bold text-gray-900 tracking-tight leading-tight">{page.title}</h1>
          {page.sub && <p className="text-[11px] text-gray-400 leading-tight mt-0.5 hidden sm:block">{page.sub}</p>}
        </div>

        {/* Right — avatar dropdown */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-[12px] font-bold text-white">
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate leading-tight max-w-[140px]">{user?.email}</p>
              <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                    <span className="text-[12px] font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); setActiveTab('account'); setSettingsOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-50 py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); handleSignOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>

            {/* Modal top bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <p className="text-sm font-bold text-gray-900">Settings</p>
              <button
                onClick={() => setSettingsOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — sidebar + content */}
            <div className="flex flex-1 min-h-0">

              {/* Sidebar */}
              <div className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col py-3 px-2">
                {/* User chip */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 mb-2">
                  <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-700 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="h-px bg-gray-100 mx-1 mb-2" />

                {/* Nav items */}
                {SETTINGS_NAV.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left w-full ${
                      activeTab === key
                        ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'account' && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Account Information</p>
                      <p className="text-[11px] text-gray-400 mb-4">Your profile and access details</p>

                      {/* Avatar row */}
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                        <div className="h-12 w-12 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                          <p className="text-xs text-gray-400 capitalize mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500">Email address</p>
                          <p className="text-xs text-gray-800 font-medium">{user?.email}</p>
                        </div>
                        <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500">Role</p>
                          <div className="flex items-center gap-1.5">
                            <Shield className="h-3 w-3 text-brand-600" />
                            <p className="text-xs text-gray-800 font-medium capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between py-2.5">
                          <p className="text-xs font-semibold text-gray-500">Platform</p>
                          <p className="text-xs text-gray-800 font-medium">GoTime Transportation</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
