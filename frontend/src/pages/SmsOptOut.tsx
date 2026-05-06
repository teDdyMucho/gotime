import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Phone, Loader2, ShieldOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^\+?1?\s*\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}$/,
      'Enter a valid US phone number'
    ),
  confirmed: z.literal(true, {
    errorMap: () => ({
      message: 'You must confirm the opt-out request to continue.',
    }),
  }),
})

type FormData = z.infer<typeof schema>

export function SmsOptOut() {
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'not_found'>('idle')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { confirmed: undefined },
  })

  const phone     = watch('phone')
  const confirmed = watch('confirmed')
  const canSubmit = !!phone?.match(/^\+?1?\s*\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}$/) && !!confirmed

  async function onSubmit(_data: FormData) {
    await new Promise((r) => setTimeout(r, 800))
    setSubmitState('success')
  }

  if (submitState === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-green-50 border border-green-100 mx-auto">
            <CheckCircle2 className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Opt-Out Confirmed</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your phone number and related SMS data have been permanently removed from our system. You will no longer receive SMS notifications from GoTime Transportation.
          </p>
          <p className="text-xs text-gray-400">
            If you have questions, contact your GoTime administrator.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-900 text-sm tracking-tight">GoTime Transportation</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">SMS Opt-Out</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Title */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-red-50 border border-red-100 mb-4">
              <ShieldOff className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">SMS Opt-Out Request</h2>
            <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Submit this form to permanently opt out of SMS notifications and remove your phone number from our system.
            </p>
          </div>

          {/* Warning banner */}
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 mb-6">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>This action is permanent and cannot be undone.</strong> Your phone number and all related SMS data will be deleted from our system.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 space-y-5">

                {/* Phone number */}
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

                {/* Confirmation checkbox */}
                <div className="rounded-xl border border-red-100 bg-red-50/40 px-4 py-4 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        className="sr-only"
                        {...register('confirmed')}
                      />
                      <div className={[
                        'h-4 w-4 rounded border-2 flex items-center justify-center transition-all',
                        confirmed
                          ? 'bg-red-600 border-red-600'
                          : errors.confirmed
                            ? 'bg-white border-red-400'
                            : 'bg-white border-gray-300 group-hover:border-red-400',
                      ].join(' ')}>
                        {confirmed && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 leading-relaxed">
                      I request to opt out of SMS notifications and permanently delete my phone number and related data from the system. I understand this action cannot be undone.
                    </span>
                  </label>

                  {errors.confirmed && (
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
                      {errors.confirmed.message}
                    </p>
                  )}
                </div>

              </div>

              {/* Submit */}
              <div className="px-6 pb-6">
                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className={[
                    'w-full h-11 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                    canSubmit && !isSubmitting
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                >
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                    : <><ShieldOff className="h-4 w-4" /> Submit Opt-Out Request</>
                  }
                </button>
              </div>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} GoTime Transportation. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
