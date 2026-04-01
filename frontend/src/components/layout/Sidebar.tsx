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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/intake', label: 'New Trip', icon: PlusCircle, roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/queue', label: 'Trip Queue', icon: ClipboardList, roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['senior_dispatcher', 'admin'] },
  { to: '/facilities', label: 'Facilities', icon: Building2, roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/requestors', label: 'Requestors', icon: Users, roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/clients', label: 'Clients', icon: UserCircle, roles: ['intake_staff', 'senior_dispatcher', 'admin'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['senior_dispatcher', 'admin'] },
  { to: '/audit', label: 'Audit Log', icon: ScrollText, roles: ['admin'] },
] as const

export function Sidebar() {
  const { user } = useAuth()

  const visibleItems = navItems.filter(
    (item) => user && (item.roles as readonly string[]).includes(user.role)
  )

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-brand-600" />
          <span className="font-bold text-brand-700 text-lg leading-tight">GoTime</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Trip Management</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        <p className="text-xs font-medium text-gray-500 capitalize">{user?.role.replace(/_/g, ' ')}</p>
      </div>
    </aside>
  )
}
