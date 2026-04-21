import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { signOut } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function AppLayout() {
  const [warnOpen, setWarnOpen] = useState(false)

  const handleWarn   = useCallback(() => setWarnOpen(true), [])
  const handleExpire = useCallback(async () => {
    setWarnOpen(false)
    await signOut()
    window.location.href = '/login'
  }, [])

  useIdleTimeout(handleWarn, handleExpire)

  async function stayLoggedIn() { setWarnOpen(false) }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>
      </div>

      <Dialog open={warnOpen} onOpenChange={setWarnOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Session Expiring Soon</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            You've been inactive for 25 minutes. You will be automatically signed out in{' '}
            <strong className="text-gray-900">5 minutes</strong> to protect patient data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={handleExpire}>Sign Out Now</Button>
            <Button onClick={stayLoggedIn}>Stay Logged In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
