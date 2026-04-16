import { useState, useEffect } from 'react'
import { supabase } from '@/lib/auth'
import { useAuth } from '@/hooks/useAuth'
import { MfaEnrollModal } from './MfaEnrollModal'
import { ShieldAlert, X } from 'lucide-react'

export function MfaBanner() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  async function checkEnrollment() {
    if (user?.role !== 'admin' || !supabase) return
    try {
      const { data } = await supabase.auth.mfa.listFactors()
      const enrolled = data?.totp?.some(f => f.status === 'verified') ?? false
      if (!enrolled) setShow(true)
    } catch { /* ignore */ }
  }

  useEffect(() => { checkEnrollment() }, [user])

  if (!show) return null

  return (
    <>
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="flex-1">
          <strong>Admin account:</strong> MFA is not enabled.{' '}
          <button
            onClick={() => setModalOpen(true)}
            className="underline font-semibold hover:text-amber-900"
          >
            Click here to set up MFA now
          </button>
          {' '}(required for HIPAA compliance).
        </span>
        <button onClick={() => setShow(false)} className="p-0.5 rounded hover:bg-amber-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <MfaEnrollModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onEnrolled={() => { setModalOpen(false); setShow(false) }}
      />
    </>
  )
}
