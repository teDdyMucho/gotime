import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileText, Shield, MessageSquare } from 'lucide-react'

export type LegalType = 'terms' | 'privacy' | 'sms'

interface LegalModalProps {
  type: LegalType
  open: boolean
  onClose: () => void
}

const SECTIONS = {
  terms: {
    icon: FileText,
    title: 'Terms & Conditions',
    effective: 'Effective Date: January 1, 2025',
    content: [
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
    ],
  },
  privacy: {
    icon: Shield,
    title: 'Privacy Policy',
    effective: 'Effective Date: January 1, 2025',
    content: [
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
    ],
  },
  sms: {
    icon: MessageSquare,
    title: 'SMS Messaging Terms',
    effective: 'Effective Date: January 1, 2025 | A2P 10DLC Compliant',
    content: [
      {
        heading: 'Program Description',
        body: 'GoTime Transportation sends automated SMS text messages to requestors who have provided express written consent. Messages include trip confirmations, scheduling updates, driver dispatch notifications, and cancellation alerts. This is a transactional messaging program operated under A2P 10DLC registration with The Campaign Registry (TCR) and in compliance with CTIA guidelines and FCC regulations.',
      },
      {
        heading: 'Sender Identification',
        body: 'All text messages sent by this program will identify the sender as "GoTime Transportation" or "GoTime" in the message body. Messages are sent from a registered 10-digit long code (10DLC) number assigned to GoTime Transportation.',
      },
      {
        heading: 'Consent & Opt-In',
        body: 'Recipients are enrolled in SMS notifications only after providing express written consent. Consent is obtained via a staff-confirmed opt-in process documented within the GoTime dispatch platform. Consent is not a condition of receiving transportation services. By opting in, the recipient agrees to receive recurring automated text messages related to their scheduled trips.',
      },
      {
        heading: 'Message Frequency',
        body: 'Message frequency varies based on trip activity. Recipients may receive up to 4 SMS messages per scheduled trip (e.g., booking confirmation, day-before reminder, driver dispatch, and completion notice). Frequency may be higher during periods of active scheduling.',
      },
      {
        heading: 'Message & Data Rates',
        body: 'Standard message and data rates may apply. GoTime Transportation does not charge for SMS messages, but recipients are responsible for any charges imposed by their mobile carrier. Check your mobile plan for SMS pricing details.',
      },
      {
        heading: 'Opt-Out Instructions (STOP)',
        body: 'To unsubscribe from GoTime Transportation text messages at any time, reply STOP to any message received. You will receive a single confirmation message: "GoTime Transportation: You have been unsubscribed and will no longer receive SMS messages from us." Your number will be removed from our active send list within 24 hours. No further messages will be sent unless you re-enroll by contacting GoTime Transportation directly.',
      },
      {
        heading: 'Help & Support (HELP)',
        body: 'To request support or information about this SMS program, reply HELP to any message. You will receive a response with our contact information. You may also contact GoTime Transportation directly through your facility coordinator or by calling our dispatch office.',
      },
      {
        heading: 'Supported Carriers',
        body: 'GoTime Transportation SMS messages are supported on all major US wireless carriers including AT&T, T-Mobile, Verizon, US Cellular, and regional carriers. Delivery is not guaranteed on all devices or networks, and GoTime Transportation is not liable for delayed or undelivered messages due to carrier issues.',
      },
      {
        heading: 'Content Restrictions',
        body: 'GoTime Transportation SMS messages will only contain content related to transportation scheduling and trip logistics. No marketing, promotional, adult, or unrelated content will be sent through this program. Messages comply with CTIA content guidelines.',
      },
      {
        heading: 'Data & Privacy',
        body: 'Mobile phone numbers collected for SMS delivery are used solely to send trip-related notifications. Numbers are not sold or shared with third parties for marketing purposes. See our Privacy Policy for full details on how SMS data is collected, stored, and protected.',
      },
      {
        heading: 'Regulatory Compliance',
        body: 'This SMS program operates in compliance with: the Telephone Consumer Protection Act (TCPA); FCC regulations governing A2P text messaging; CTIA Messaging Principles and Best Practices; and A2P 10DLC registration requirements enforced by US wireless carriers. All consent records are retained for a minimum of 4 years per TCPA recordkeeping requirements.',
      },
      {
        heading: 'Contact Information',
        body: 'GoTime Transportation — For questions about this SMS program, contact your facility coordinator or the GoTime dispatch office. To opt out, reply STOP at any time. To get help, reply HELP.',
      },
    ],
  },
}

export function LegalModal({ type, open, onClose }: LegalModalProps) {
  const doc = SECTIONS[type]
  const Icon = doc.icon

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-brand-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">{doc.title}</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{doc.effective}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">
            {doc.content.map((section) => (
              <div key={section.heading}>
                <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest mb-2">
                  {section.heading}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
