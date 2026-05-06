import { Shield, Truck } from 'lucide-react'

const SECTIONS = [
  {
    heading: '1. Overview',
    body: 'GoTime Transportation ("we," "us," or "our") is committed to protecting the privacy and security of information processed through the GoTime dispatch platform. This Privacy Policy explains how we collect, use, store, and protect data in connection with your use of the Platform.',
  },
  {
    heading: '2. Information We Collect',
    body: 'We collect the following categories of information: (a) Account Information — your name, email address, employee ID, and role; (b) Usage Data — actions performed within the Platform, including trip records created, updated, or deleted, and timestamps of all activity; (c) Authentication Data — login events, MFA verification attempts, and session information; (d) Trip & Client Data — requestor details, client records, facility information, and pay source data entered during normal operations; (e) SMS Consent Records — when SMS notification is enabled for a requestor, we record the date, time, and staff member who confirmed opt-in consent on behalf of the requestor.',
  },
  {
    heading: '3. How We Use Your Information',
    body: 'Information collected through the Platform is used to: (a) authenticate and authorize your access; (b) facilitate dispatch operations and trip management; (c) maintain a complete and accurate audit trail for compliance and accountability purposes; (d) generate operational reports and analytics for management review; (e) investigate security incidents, policy violations, or disputes; and (f) fulfill our legal and regulatory obligations.',
  },
  {
    heading: '4. SMS & Text Message Data',
    body: 'When a requestor is enrolled for SMS notifications, we collect and store their mobile phone number and a record of their consent. Mobile phone numbers collected for SMS delivery are used solely to send trip-related notifications (e.g., trip confirmations, scheduling updates, and cancellations) from GoTime Transportation. We do not sell, rent, or share mobile phone numbers with third parties for marketing purposes. Numbers are shared only with our authorized SMS service provider solely for message delivery. Recipients may opt out of SMS at any time by replying STOP to any message. Upon opt-out, the number is removed from our active send list within 24 hours.',
  },
  {
    heading: '5. Audit Logging',
    body: 'All actions performed within the Platform are recorded in an immutable audit log. This includes record creation, updates, deletions, login events, and administrative actions. Audit logs are retained in accordance with our data retention policy and may be reviewed by authorized administrators at any time for compliance or investigative purposes.',
  },
  {
    heading: '6. Data Sharing',
    body: 'We do not sell your personal information. We may share information with: (a) authorized administrators and senior staff within GoTime Transportation who have a legitimate business need; (b) service providers who assist in operating the Platform (e.g., cloud infrastructure, authentication providers, and SMS delivery providers) under strict data processing agreements; (c) law enforcement or regulatory authorities when required by applicable law or in response to a valid legal process.',
  },
  {
    heading: '7. Data Security',
    body: 'We implement industry-standard technical and organizational measures to protect the information processed on the Platform. These include encrypted data transmission (TLS), multi-factor authentication for privileged accounts, role-based access controls, and regular security reviews. However, no system is completely immune to security risks, and we cannot guarantee absolute security.',
  },
  {
    heading: '8. Client & Requestor Data',
    body: 'Personal information belonging to clients, requestors, and individuals mentioned in trip records is processed on behalf of GoTime Transportation for the sole purpose of providing transportation coordination services. Such data is subject to applicable privacy laws and is handled with care and confidentiality. Access is restricted to staff with a legitimate operational need.',
  },
  {
    heading: '9. Data Retention',
    body: 'We retain operational data, audit logs, and user account information for as long as required by applicable laws and our internal data retention policies. SMS consent records are retained for a minimum of 4 years to satisfy TCPA recordkeeping requirements. When data is no longer required, it is securely deleted or anonymized in accordance with our data disposal procedures.',
  },
  {
    heading: '10. Your Rights',
    body: 'Where applicable law grants you rights regarding your personal data — such as the right to access, correct, or request deletion — you may submit a request to your system administrator or the GoTime IT department. SMS recipients may withdraw consent at any time by replying STOP to any GoTime Transportation text message. We will respond to all requests in accordance with applicable legal requirements.',
  },
  {
    heading: '11. Cookies & Local Storage',
    body: 'The Platform uses browser session storage and cookies strictly for authentication and session management purposes. No tracking or advertising cookies are used. Session data is cleared upon logout or session expiration.',
  },
  {
    heading: '12. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Changes will be communicated through the Platform or via your system administrator. Continued use of the Platform after any changes constitutes acceptance of the updated policy.',
  },
  {
    heading: '13. Contact',
    body: 'If you have questions or concerns about this Privacy Policy or how your information is handled, please contact your system administrator or the GoTime Transportation IT department.',
  },
]

export function PrivacyPage() {
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
            <span className="text-sm text-gray-500 truncate">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Title block */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2.5 bg-brand-50 border border-brand-100 rounded-xl px-4 py-2 mb-5">
            <Shield className="h-4 w-4 text-brand-600" />
            <span className="text-xs font-bold text-brand-700 uppercase tracking-widest">Legal Document</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
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
            href="/terms-and-conditions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium underline-offset-2 hover:underline transition-colors"
          >
            Terms & Conditions →
          </a>
        </div>
      </div>
    </div>
  )
}
