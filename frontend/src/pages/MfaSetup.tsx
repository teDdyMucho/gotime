import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/auth'
import { Truck, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type Step = 'qr' | 'verify' | 'done'

export function MfaSetup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('qr')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { startEnroll() }, [])

  async function startEnroll() {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'GoTime Admin',
    })
    setLoading(false)
    if (error || !data) {
      // TOTP disabled on Supabase — skip MFA setup entirely
      if (error?.message?.toLowerCase().includes('disabled')) {
        navigate('/queue')
        return
      }
      setError(error?.message ?? 'Failed to start enrollment')
      return
    }
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setFactorId(data.id)
  }

  async function verify() {
    if (!supabase || !factorId) return
    setLoading(true)
    setError(null)
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId })
    if (cErr || !challenge) { setLoading(false); setError('Challenge failed — try again'); return }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setLoading(false)
    if (vErr) { setError('Invalid code — check your authenticator app'); return }
    setStep('done')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-8 w-8 text-brand-600" />
            <span className="text-2xl font-bold text-brand-700">GoTime</span>
          </div>
          <p className="text-sm text-gray-500">Transportation Management</p>
        </div>

        <Card>
          {step === 'qr' && (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-600" />
                  <CardTitle className="text-lg">Set Up Two-Factor Auth</CardTitle>
                </div>
                <CardDescription>
                  Required for admin accounts. Scan the QR code with your authenticator app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                  </div>
                ) : qrCode ? (
                  <>
                    <div className="flex justify-center">
                      <img src={qrCode} alt="MFA QR Code" className="w-52 h-52 border rounded-xl p-2 bg-white" />
                    </div>
                    <div className="rounded-md bg-gray-50 p-3 text-center space-y-1">
                      <p className="text-xs text-gray-500">Or enter this key manually in your app:</p>
                      <code className="text-xs font-mono text-gray-800 break-all select-all">{secret}</code>
                    </div>
                    <p className="text-xs text-center text-gray-400">
                      Use <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
                <Button className="w-full" onClick={() => setStep('verify')} disabled={!qrCode}>
                  I scanned it — Next
                </Button>
              </CardContent>
            </>
          )}

          {step === 'verify' && (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-600" />
                  <CardTitle className="text-lg">Verify Your Code</CardTitle>
                </div>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app to confirm setup.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()}
                />
                {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
                <Button className="w-full" onClick={verify} disabled={code.length !== 6 || loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable MFA'}
                </Button>
                <button
                  type="button"
                  className="w-full text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => { setStep('qr'); setCode(''); setError(null) }}
                >
                  ← Back to QR code
                </button>
              </CardContent>
            </>
          )}

          {step === 'done' && (
            <CardContent className="py-8 text-center space-y-4">
              <ShieldCheck className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="font-semibold text-gray-900 text-lg">MFA Enabled!</p>
                <p className="text-sm text-gray-500 mt-1">
                  Your account is now protected. You'll need your authenticator app on every login.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/queue')}>
                Go to App
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
