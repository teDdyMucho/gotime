import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Loader2, User, Mail, Phone, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+?1?\s*\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}$/, 'Enter a valid US phone number'),
  smsOptIn: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to receive SMS notifications to continue.' }),
  }),
})

type FormData = z.infer<typeof schema>

const FEATURES = [
  { label: 'Real-time dispatch queue' },
  { label: 'Automated requestor notifications' },
  { label: 'Full audit trail & compliance' },
]

export function Register() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { smsOptIn: undefined },
  })

  const smsOptIn = watch('smsOptIn')
  const firstName = watch('first_name')
  const lastName  = watch('last_name')
  const email     = watch('email')
  const phone     = watch('phone')

  const allFilled = !!firstName && !!lastName && !!email && !!phone && !!smsOptIn

  async function onSubmit(_data: FormData) {
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-50 border border-brand-100 mx-auto">
            <CheckCircle2 className="h-7 w-7 text-brand-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Registration Submitted</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your registration request has been received. An administrator will review and activate your account shortly.
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            Back to Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-[480px] shrink-0 flex-col relative overflow-hidden bg-gray-950">
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-brand-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-brand-600/10 blur-[100px] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight tracking-tight">GoTime</p>
              <p className="text-[11px] text-white/35 leading-tight tracking-widest uppercase">Transportation</p>
            </div>
          </div>

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

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-brand-600/20 border border-brand-600/30 flex items-center justify-center shrink-0">
                    <svg className="h-2.5 w-2.5 text-brand-400" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
        <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-brand-100/40 blur-[120px] pointer-events-none" />

        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center">
            <Truck className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">GoTime</span>
        </div>

        <div className="relative z-10 w-full max-w-[420px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create an account</h2>
            <p className="mt-1.5 text-sm text-gray-500">Register to request access to the GoTime platform</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 space-y-5">

                {/* First & Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="first_name" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                      First Name <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <Input
                        id="first_name"
                        placeholder="John"
                        className="h-11 pl-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                        {...register('first_name')}
                      />
                    </div>
                    {errors.first_name && (
                      <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                        {errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="last_name" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                      Last Name <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                      <Input
                        id="last_name"
                        placeholder="Doe"
                        className="h-11 pl-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                        {...register('last_name')}
                      />
                    </div>
                    {errors.last_name && (
                      <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                        {errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@gotime.com"
                      autoComplete="email"
                      className="h-11 pl-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                    Phone Number <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      autoComplete="tel"
                      className="h-11 pl-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* SMS Opt-in */}
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <svg className="h-3.5 w-3.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 16 16">
                      <path d="M2 4h12a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      <path d="M1 5l7 5 7-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">SMS Opt-in Agreement</span>
                  </div>

                  <div className="px-4 py-4 space-y-3 bg-white">
                    {/* Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only"
                          {...register('smsOptIn')}
                        />
                        <div className={[
                          'h-4 w-4 rounded border-2 flex items-center justify-center transition-all',
                          smsOptIn
                            ? 'bg-gray-900 border-gray-900'
                            : errors.smsOptIn
                              ? 'bg-white border-red-400'
                              : 'bg-white border-gray-300 group-hover:border-gray-500',
                        ].join(' ')}>
                          {smsOptIn && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed">
                        I agree to receive transactional SMS notifications. Message &amp; data rates may apply. Reply STOP to unsubscribe, HELP for support.
                      </span>
                    </label>

                    {errors.smsOptIn && (
                      <p className="text-xs text-red-500 flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                        {errors.smsOptIn.message}
                      </p>
                    )}

                    {/* Submit Opt-in style button — acts as the form submit */}
                    <Button
                      type="submit"
                      disabled={isSubmitting || !allFilled}
                      className={[
                        'w-full h-10 text-sm font-semibold rounded-lg transition-all',
                        allFilled
                          ? 'bg-gray-900 hover:bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                      ].join(' ')}
                    >
                      {isSubmitting
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                        : 'Submit Opt-in'
                      }
                    </Button>
                  </div>
                </div>

              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
