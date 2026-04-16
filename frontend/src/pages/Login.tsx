import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, ShieldCheck, Loader2 } from 'lucide-react'
import { signIn, enableDevBypassAuth, isSupabaseConfigured, supabase } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

type Step = 'credentials' | 'mfa'

export function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('credentials')
  const [mfaFactorId, setMfaFactorId] = useState<string>('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Step 1 — email + password
  async function onSubmit(data: FormData) {
    setError(null)
    try {
      await signIn(data.email, data.password)

      // Check if MFA is required for this user
      if (!supabase) { navigate('/queue'); return }

      const { data: factors } = await supabase.auth.mfa.listFactors()
      const hasEnrolled = factors?.totp?.some(f => f.status === 'verified') ?? false

      // If admin has no MFA enrolled yet — force enrollment
      const { data: { user: sbUser } } = await supabase.auth.getUser()
      const role = sbUser?.user_metadata?.role
      if (!hasEnrolled && role === 'admin') {
        navigate('/mfa-setup')
        return
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        // User has MFA enrolled — need to verify
        const totp = factors?.totp?.[0]
        if (totp) {
          setMfaFactorId(totp.id)
          setStep('mfa')
          return
        }
      }
      navigate('/queue')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }

  // Step 2 — TOTP code
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
          {step === 'credentials' && (
            <>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@gotime.com"
                      autoComplete="email"
                      {...register('email')}
                    />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                  )}

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </Button>

                  {!isSupabaseConfigured && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => { enableDevBypassAuth(); navigate('/queue') }}
                    >
                      Continue with local UI (no Supabase)
                    </Button>
                  )}
                </form>
              </CardContent>
            </>
          )}

          {step === 'mfa' && (
            <>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-600" />
                  <CardTitle className="text-xl">Two-Factor Auth</CardTitle>
                </div>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && mfaCode.length === 6 && onMfaSubmit()}
                />

                {error && (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
                )}

                <Button
                  className="w-full"
                  onClick={onMfaSubmit}
                  disabled={mfaCode.length !== 6 || mfaLoading}
                >
                  {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>

                <button
                  type="button"
                  className="w-full text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => { setStep('credentials'); setMfaCode(''); setError(null) }}
                >
                  ← Back to sign in
                </button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
