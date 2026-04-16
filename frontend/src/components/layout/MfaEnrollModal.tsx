import { useState } from 'react'
import { supabase } from '@/lib/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2 } from 'lucide-react'

type Step = 'qr' | 'verify' | 'done'

interface Props {
  open: boolean
  onClose: () => void
  onEnrolled: () => void
}

export function MfaEnrollModal({ open, onClose, onEnrolled }: Props) {
  const [step, setStep] = useState<Step>('qr')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [factorId, setFactorId] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function startEnroll() {
    if (!supabase) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'GoTime Admin',
    })
    setLoading(false)
    if (error || !data) { setError(error?.message ?? 'Failed to start enrollment'); return }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setFactorId(data.id)
    setStep('qr')
  }

  async function verifyCode() {
    if (!supabase || !factorId) return
    setLoading(true)
    setError(null)
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setLoading(false); setError('Could not create challenge'); return }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setLoading(false)
    if (error) { setError('Invalid code — try again'); return }
    setStep('done')
  }

  function handleOpen(open: boolean) {
    if (open && step === 'qr' && !qrCode) startEnroll()
    if (!open) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            Set Up MFA
          </DialogTitle>
        </DialogHeader>

        {step === 'qr' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              </div>
            ) : qrCode ? (
              <>
                <div className="flex justify-center">
                  <img src={qrCode} alt="MFA QR Code" className="w-48 h-48 border rounded-lg p-2" />
                </div>
                <div className="rounded-md bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Or enter this secret manually:</p>
                  <code className="text-xs font-mono text-gray-800 break-all">{secret}</code>
                </div>
              </>
            ) : (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep('verify')} disabled={!qrCode}>
                Next — Enter Code
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the <strong>6-digit code</strong> from your authenticator app to verify.
            </p>
            <div className="space-y-1.5">
              <Label>Verification Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="text-center text-xl tracking-widest font-mono"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verifyCode()}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('qr')}>Back</Button>
              <Button onClick={verifyCode} disabled={code.length !== 6 || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Enable MFA'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center py-2">
            <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-900">MFA Enabled!</p>
            <p className="text-sm text-gray-500">
              Your admin account is now protected with multi-factor authentication.
            </p>
            <Button className="w-full" onClick={onEnrolled}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
