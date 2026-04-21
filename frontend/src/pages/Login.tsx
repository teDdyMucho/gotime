import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, ShieldCheck, Loader2 } from 'lucide-react'
import { signIn, supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>
type Step = 'credentials' | 'mfa'

export function Login() {
  const navigate = useNavigate()
  const [step, setStep]                   = useState<Step>('credentials')
  const [mfaFactorId, setMfaFactorId]     = useState<string>('')
  const [mfaCode, setMfaCode]             = useState('')
  const [mfaLoading, setMfaLoading]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    try {
      await signIn(data.email, data.password)
      if (!supabase) { navigate('/queue'); return }

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasEnrolled = factors?.totp?.some(f => f.status === 'verified') ?? false
      const { data: aal }   = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (hasEnrolled && aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const totp = factors?.totp?.[0]
        if (totp) { setMfaFactorId(totp.id); setStep('mfa'); return }
      }

      const { data: { user: sbUser } } = await supabase.auth.getUser()
      const role = sbUser?.user_metadata?.role
      if (!hasEnrolled && role === 'admin' && aal?.nextLevel === 'aal2') {
        navigate('/mfa-setup'); return
      }
      navigate('/queue')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }

  async function onMfaSubmit() {
    if (!supabase || !mfaFactorId) return
    setMfaLoading(true)
    setError(null)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (cErr || !challenge) throw new Error(cErr?.message ?? 'MFA challenge failed')
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      })
      if (vErr) throw new Error('Invalid code — try again')
      navigate('/queue')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'MFA failed')
    } finally {
      setMfaLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] flex-col justify-between bg-gray-900 border-r border-white/8 px-10 py-12">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">GoTime</span>
        </div>
        <div>
          <p className="text-3xl font-bold text-white leading-snug">
            Dispatch smarter.<br />Move people faster.
          </p>
          <p className="mt-3 text-sm text-white/45 leading-relaxed">
            GoTime Transportation Management — built for dispatch teams who need speed, clarity, and control.
          </p>
        </div>
        <p className="text-xs text-white/25">© {new Date().getFullYear()} GoTime Transportation</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">GoTime</span>
          </div>

          {step === 'credentials' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
              <p className="text-sm text-gray-500 mb-8">Sign in to your GoTime account</p>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@gotime.com"
                      autoComplete="email"
                      className="h-10 bg-gray-50 border-gray-200 focus:bg-white"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      className="h-10 bg-gray-50 border-gray-200 focus:bg-white"
                      {...register('password')}
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-10 mt-1" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {step === 'mfa' && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <h1 className="text-2xl font-bold text-gray-900">Two-Factor Auth</h1>
              </div>
              <p className="text-sm text-gray-500 mb-8">Enter the 6-digit code from your authenticator app</p>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <Input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-gray-50"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && mfaCode.length === 6 && onMfaSubmit()}
                />

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button className="w-full h-10" onClick={onMfaSubmit} disabled={mfaCode.length !== 6 || mfaLoading}>
                  {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>

                <button
                  type="button"
                  className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => { setStep('credentials'); setMfaCode(''); setError(null) }}
                >
                  ← Back to sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
