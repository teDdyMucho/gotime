import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, ShieldCheck, Loader2, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { signIn, supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms & Conditions and Privacy Policy to continue.' }),
  }),
})
type FormData = z.infer<typeof schema>
type Step = 'credentials' | 'mfa'

const FEATURES = [
  { label: 'Real-time dispatch queue' },
  { label: 'Automated requestor notifications' },
  { label: 'Full audit trail & compliance' },
]

export function Login() {
  const navigate = useNavigate()
  const [step, setStep]               = useState<Step>('credentials')
  const [mfaFactorId, setMfaFactorId] = useState<string>('')
  const [mfaCode, setMfaCode]         = useState('')
  const [mfaLoading, setMfaLoading]   = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { agreedToTerms: undefined },
  })

  const agreedToTerms = watch('agreedToTerms')

  async function onSubmit(data: FormData) {
    setError(null)
    if (!data.agreedToTerms) {
      setError('You must agree to the Terms & Conditions and Privacy Policy to continue.')
      return
    }
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
    <div className="flex min-h-screen">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[480px] shrink-0 flex-col relative overflow-hidden bg-gray-950">
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-brand-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-brand-600/10 blur-[100px] pointer-events-none" />

        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight tracking-tight">GoTime</p>
              <p className="text-[11px] text-white/35 leading-tight tracking-widest uppercase">Transportation</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="mt-auto mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-600/15 border border-brand-600/25 px-3.5 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest">Dispatch Platform</span>
            </div>

            <h1 className="text-4xl font-extrabold text-white leading-[1.15] tracking-tight">
              Dispatch smarter.<br />
              <span className="text-brand-400">Move people faster.</span>
            </h1>
            <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-xs">
              Built for dispatch teams who need speed, clarity, and full operational control.
            </p>

            {/* Feature list */}
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0">
                    <svg className="h-2.5 w-2.5 text-brand-400" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-sm text-white/55">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/20">© {new Date().getFullYear()} GoTime Transportation. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 relative px-6 py-12">
        {/* Subtle brand tint orb */}
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-brand-100/40 blur-[120px] pointer-events-none" />

        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Truck className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">GoTime</span>
        </div>

        <div className="relative z-10 w-full max-w-[400px]">

          {/* ── Credentials step ── */}
          {step === 'credentials' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
                <p className="mt-1.5 text-sm text-gray-500">Sign in to your GoTime account to continue</p>
              </div>

              {/* Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6 space-y-5">

                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@gotime.com"
                        autoComplete="email"
                        className="h-11 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                        {...register('email')}
                      />
                      {errors.email && (
                        <p className="text-xs text-red-500 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          className="h-11 bg-gray-50 border-gray-200 focus:bg-white text-sm pr-10"
                          {...register('password')}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-xs text-red-500 flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {error && (
                      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-start gap-2.5">
                        <svg className="h-4 w-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 16 16">
                          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Terms & sign-in consent + button */}
                  <div className="px-6 pt-3 pb-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          {...register('agreedToTerms')}
                        />
                        <div className={[
                          'h-4 w-4 rounded border-2 flex items-center justify-center transition-all',
                          agreedToTerms
                            ? 'bg-brand-600 border-brand-600'
                            : errors.agreedToTerms
                              ? 'bg-white border-red-400'
                              : 'bg-white border-gray-300 group-hover:border-brand-400',
                        ].join(' ')}>
                          {agreedToTerms && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        I agree to the{' '}
                        <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline transition-colors">
                          Terms & Conditions
                        </a>
                        {' '}and{' '}
                        <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline transition-colors">
                          Privacy Policy
                        </a>
                      </span>
                    </label>
                    {errors.agreedToTerms && (
                      <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                        {errors.agreedToTerms.message}
                      </p>
                    )}
                  </div>

                  <div className="px-6 pt-3 pb-6">
                    <Button
                      type="submit"
                      className="w-full h-11 text-sm gap-2"
                      disabled={isSubmitting || !agreedToTerms}
                    >
                      {isSubmitting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                        : <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>
                      }
                    </Button>
                  </div>
                </form>
              </div>

              <p className="mt-5 text-center text-xs text-gray-400">
                Access is restricted to authorized GoTime staff only.
              </p>
            </div>
          )}

          {/* ── MFA step ── */}
          {step === 'mfa' && (
            <div>
              <div className="mb-8">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-50 border border-brand-100 mb-4">
                  <ShieldCheck className="h-6 w-6 text-brand-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Two-Factor Auth</h2>
                <p className="mt-1.5 text-sm text-gray-500">Enter the 6-digit code from your authenticator app</p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-5">
                  {/* Code dots */}
                  <div className="flex justify-center gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-2 w-2 rounded-full transition-all duration-150"
                        style={{
                          background: i < mfaCode.length ? '#1a7a3c' : '#e5e7eb',
                          transform: i < mfaCode.length ? 'scale(1.2)' : 'scale(1)',
                          boxShadow: i < mfaCode.length ? '0 0 6px rgba(26,122,60,0.4)' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <Input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-3xl tracking-[0.6em] font-mono h-16 bg-gray-50 border-gray-200 focus:bg-white"
                    maxLength={6}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && mfaCode.length === 6 && onMfaSubmit()}
                  />

                  {error && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-start gap-2.5">
                      <svg className="h-4 w-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 16 16">
                        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      {error}
                    </div>
                  )}

                  <Button
                    className="w-full h-11 text-sm gap-2"
                    onClick={onMfaSubmit}
                    disabled={mfaCode.length !== 6 || mfaLoading}
                  >
                    {mfaLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                      : <><ShieldCheck className="h-4 w-4" /><span>Verify Code</span></>
                    }
                  </Button>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                  <button
                    type="button"
                    className="w-full text-xs text-gray-400 hover:text-gray-700 transition-colors font-medium"
                    onClick={() => { setStep('credentials'); setMfaCode(''); setError(null) }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
