import { MessageSquare } from 'lucide-react'

interface SmsConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export function SmsConsentCheckbox({ checked, onChange, error }: SmsConsentCheckboxProps) {
  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-violet-600 shrink-0" />
          <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">
            SMS Consent Required (A2P 10DLC)
          </span>
        </div>

        {/* Disclosure text */}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          By enabling SMS notifications, you confirm that this requestor has given <strong className="text-gray-700">express written consent</strong> to receive automated text messages from GoTime Transportation at the phone number provided. Msg &amp; data rates may apply. Up to 4 msgs/trip. Reply STOP to unsubscribe, HELP for support.
        </p>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <div className={[
              'h-4 w-4 rounded border-2 flex items-center justify-center transition-all',
              checked
                ? 'bg-violet-600 border-violet-600'
                : error
                  ? 'bg-white border-red-400'
                  : 'bg-white border-gray-300 group-hover:border-violet-400',
            ].join(' ')}>
              {checked && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-600 leading-relaxed">
            I confirm this requestor has provided express written consent to receive SMS notifications from GoTime Transportation. Consent is not a condition of service. See our{' '}
            <a
              href="/terms-and-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 font-medium underline-offset-2 hover:underline transition-colors"
            >
              SMS Messaging Terms
            </a>
            {' '}and{' '}
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 hover:text-violet-700 font-medium underline-offset-2 hover:underline transition-colors"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-red-500 inline-block shrink-0" />
            {error}
          </p>
        )}
    </div>
  )
}
