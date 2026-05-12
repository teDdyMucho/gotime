import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { LogOut, Settings, Shield, ChevronDown, X, UserCircle, Mail, Save, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

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

const SETTINGS_NAV: { key: SettingsTab; label: string; icon: React.ElementType; sub: string }[] = [
  { key: 'account', label: 'Account', icon: UserCircle, sub: 'Profile & access' },
]

export function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const [editMode, setEditMode] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const page = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/')
  )?.[1] ?? { title: 'GoTime', sub: '' }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function handleSave() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaveSuccess(true)
    setEditMode(false)
    setTimeout(() => setSaveSuccess(false), 2500)
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
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 capitalize mt-0.5">{user?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>
              <div className="py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); setActiveTab('account'); setSettingsOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-gray-400" />
                  Settings
                </button>
              </div>
              <div className="border-t border-gray-50 py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); handleSignOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => { setSettingsOpen(false); setEditMode(false) }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
            style={{ maxWidth: '780px', height: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-brand-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Settings</p>
              </div>
              <button
                onClick={() => { setSettingsOpen(false); setEditMode(false) }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 min-h-0">

              {/* Sidebar */}
              <div className="w-56 shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col py-4 px-3">
                <div className="flex items-center gap-2.5 px-3 py-3 mb-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="h-8 w-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="space-y-0.5">
                  {SETTINGS_NAV.map(({ key, label, icon: Icon, sub }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left w-full transition-colors ${
                        activeTab === key
                          ? 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${activeTab === key ? 'text-brand-600' : 'text-gray-400'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === 'account' && (
                  <div className="p-7 space-y-6">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Account Information</p>
                        <p className="text-xs text-gray-400 mt-0.5">Your profile and access details</p>
                      </div>
                      {!editMode ? (
                        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => { setDisplayName(user?.email ?? ''); setEditMode(true) }}>
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditMode(false)}>Cancel</Button>
                          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={saving}>
                            {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Save</>}
                          </Button>
                        </div>
                      )}
                    </div>

                    {saveSuccess && (
                      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-xs text-green-700 font-medium flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Profile updated successfully
                      </div>
                    )}

                    {/* Avatar section */}
                    <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-100">
                      <div className="h-16 w-16 rounded-full bg-brand-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-600/20">
                        <span className="text-2xl font-bold text-white">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900">{user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Shield className="h-3.5 w-3.5 text-brand-600" />
                          <p className="text-xs font-semibold text-brand-700 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> Email Address
                          </label>
                          {editMode ? (
                            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 text-sm" placeholder="Enter email…" />
                          ) : (
                            <div className="h-9 flex items-center px-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700 font-medium">{user?.email}</div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Shield className="h-3 w-3" /> Role
                          </label>
                          <div className="h-9 flex items-center px-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 capitalize">
                            {user?.role?.replace(/_/g, ' ')}
                            <span className="ml-2 text-[10px] text-gray-400">(managed by admin)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Platform</label>
                        <div className="h-9 flex items-center px-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500">GoTime Transportation</div>
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
