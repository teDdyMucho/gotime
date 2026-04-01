import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function TopBar() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-500">
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
