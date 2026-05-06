import { FileText, Truck } from 'lucide-react'

const SECTIONS = [
  {
    heading: '1. Acceptance of Terms',
    body: 'By accessing or using the GoTime Transportation dispatch platform ("Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, you may not access the Platform. These terms apply to all authorized staff, dispatchers, administrators, and any other users granted access by GoTime Transportation.',
  },
  {
    heading: '2. Authorized Use Only',
    body: 'Access to the Platform is restricted to current employees, contractors, and authorized personnel of GoTime Transportation. Sharing your credentials, providing unauthorized access to third parties, or using the Platform for any purpose outside of your assigned duties is strictly prohibited and may result in immediate termination of access and further disciplinary or legal action.',
  },
  {
    heading: '3. Account Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your login credentials. You must immediately notify your system administrator if you suspect any unauthorized use of your account. GoTime Transportation is not liable for any loss or damage arising from your failure to comply with this security requirement.',
  },
  {
    heading: '4. Acceptable Use',
    body: "You agree not to: (a) access, tamper with, or use non-public areas of the Platform; (b) probe, scan, or test the vulnerability of any system or network; (c) introduce malicious code or interfere with the Platform's operation; (d) access or collect data beyond what is necessary for your role; or (e) use the Platform in any manner that violates applicable law or regulation.",
  },
  {
    heading: '5. Data Integrity',
    body: 'All trip records, requestor data, client information, and audit logs entered into the Platform must be accurate and complete. Falsifying, altering, or deleting records without proper authorization is prohibited and may constitute fraud. All actions within the Platform are logged and subject to audit.',
  },
  {
    heading: '6. SMS Messaging Terms (A2P 10DLC)',
    body: 'GoTime Transportation sends automated text messages (A2P SMS) to requestors who have provided express written consent. By selecting SMS or Email + SMS as a notification method and checking the SMS consent checkbox, you confirm that the requestor has expressly consented to receive automated text messages from GoTime Transportation at the phone number provided. Consent is not a condition of receiving transportation services. Standard message and data rates may apply. Message frequency varies based on trip activity (up to 4 messages per trip). Recipients may opt out at any time by replying STOP to any message. For help, recipients may reply HELP or contact GoTime Transportation at the contact information provided. All SMS activity is subject to applicable FCC regulations, TCPA, and CTIA guidelines.',
  },
  {
    heading: '7. Intellectual Property',
    body: 'The Platform, including its design, features, software, and content, is the exclusive property of GoTime Transportation. You are granted a limited, non-exclusive, non-transferable license to use the Platform solely for authorized business purposes. You may not copy, modify, distribute, or reverse-engineer any part of the Platform.',
  },
  {
    heading: '8. Availability & Modifications',
    body: 'GoTime Transportation reserves the right to modify, suspend, or discontinue the Platform at any time without notice. We may also update these Terms & Conditions at any time. Continued use of the Platform after any changes constitutes acceptance of the updated terms.',
  },
  {
    heading: '9. Disclaimer of Warranties',
    body: 'The Platform is provided "as is" without warranties of any kind. GoTime Transportation does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of the Platform is at your sole risk.',
  },
  {
    heading: '10. Limitation of Liability',
    body: 'To the fullest extent permitted by law, GoTime Transportation shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform, even if advised of the possibility of such damages.',
  },
  {
    heading: '11. Governing Law',
    body: 'These Terms & Conditions are governed by and construed in accordance with the laws of the applicable jurisdiction where GoTime Transportation operates, without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration or in the courts of competent jurisdiction.',
  },
  {
    heading: '12. Contact',
    body: 'If you have questions about these Terms & Conditions, please contact your system administrator or the GoTime Transportation IT department.',
  },
]

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-gray-900 text-sm tracking-tight">GoTime Transportation</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 truncate">Terms & Conditions</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2.5 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2 mb-5">
            <FileText className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-bold text-brand-700 uppercase tracking-widest">Legal Document</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Terms & Conditions</h1>
          <p className="mt-2 text-sm text-gray-400">Effective Date: January 1, 2025</p>
          <div className="mt-6 h-px bg-gray-200" />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-3">
                {section.heading}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} GoTime Transportation. All rights reserved.</p>
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline transition-colors"
          >
            Privacy Policy →
          </a>
        </div>
      </div>
    </div>
  )
}
