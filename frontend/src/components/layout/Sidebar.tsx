import { NavLink } from 'react-router-dom'
import {
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Building2,
  Users,
  UserCircle,
  ScrollText,
  Truck,
  Bell,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/intake',        label: 'New Trip',      icon: PlusCircle,     roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/queue',         label: 'Trip Queue',    icon: ClipboardList,  roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard,roles: ['senior_dispatcher', 'admin'] },
  { to: '/facilities',    label: 'Facilities',    icon: Building2,      roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/requestors',    label: 'Requestors',    icon: Users,          roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/clients',       label: 'Clients',       icon: UserCircle,     roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/pay-sources',   label: 'Pay Sources',   icon: CreditCard,     roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell,           roles: ['senior_dispatcher', 'admin'] },
  { to: '/audit',         label: 'Audit Log',     icon: ScrollText,     roles: ['admin'] },
] as const

const NAV_GROUPS = [
  { label: 'Operations',  items: ['/intake', '/queue'] },
  { label: 'Analytics',   items: ['/dashboard'] },
  { label: 'Records',     items: ['/facilities', '/requestors', '/clients', '/pay-sources'] },
  { label: 'System',      items: ['/notifications', '/audit'] },
]

export function Sidebar() {
  const { user } = useAuth()

  const visibleItems = navItems.filter(
    (item) => user && (item.roles as readonly string[]).includes(user.role)
  )

  const visiblePaths = new Set(visibleItems.map((i) => i.to))

  return (
    <aside className="w-58 bg-gray-950 flex flex-col shrink-0" style={{ width: '224px' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Truck className="h-4.5 w-4.5 text-white" style={{ height: '18px', width: '18px' }} />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-tight tracking-tight">GoTime</p>
            <p className="text-[10px] text-white/40 leading-tight">Transportation</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-hidden">
        {NAV_GROUPS.map((group) => {
          const groupItems = group.items
            .map((path) => visibleItems.find((i) => i.to === path))
            .filter((i): i is typeof visibleItems[number] => !!i && visiblePaths.has(i.to))
          if (!groupItems.length) return null
          return (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {groupItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-white/55 hover:bg-white/6 hover:text-white/90'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3.5 border-t border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-brand-600/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-brand-400">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-white/60 truncate leading-tight">{user?.email}</p>
            <p className="text-[10px] font-medium text-white/35 capitalize leading-tight mt-0.5">
              {user?.role.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
