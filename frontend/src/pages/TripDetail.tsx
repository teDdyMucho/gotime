import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTrip, useReviewTrip, useCancelTrip } from '@/hooks/useTrips'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/auth'
import { facilitiesApi, requestorsApi, clientsApi, paySourcesApi, tripsApi } from '@/lib/api'
import type { Facility, Requestor, Client, PaySource, DeclineReason, CancellationReason, ReviewState } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  ArrowLeft, AlertTriangle, Bell, Phone, Mail, MapPin, Calendar,
  User, Building2, CreditCard, CheckCircle2, Clock, Car, FileText, Hash,
} from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency, formatTime } from '@/lib/utils'

const DECLINE_REASONS: { value: DeclineReason; label: string }[] = [
  { value: 'outside_service_area',       label: 'Outside Service Area' },
  { value: 'no_availability',            label: 'No Availability' },
  { value: 'insufficient_notice',        label: 'Insufficient Notice' },
  { value: 'missing_authorization',      label: 'Missing Authorization' },
  { value: 'unsupported_mobility',       label: 'Unsupported Mobility' },
  { value: 'pay_source_issue',           label: 'Pay Source Issue' },
  { value: 'duplicate_request',          label: 'Duplicate Request' },
  { value: 'request_incomplete',         label: 'Request Incomplete' },
  { value: 'requestor_unreachable',      label: 'Requestor Unreachable' },
  { value: 'not_operationally_feasible', label: 'Not Operationally Feasible' },
  { value: 'other',                      label: 'Other' },
]

const CLARIFICATION_REASONS: { value: string; label: string }[] = [
  { value: 'missing_auth',           label: 'Missing Authorization' },
  { value: 'incomplete_info',        label: 'Incomplete Information' },
  { value: 'wrong_address',          label: 'Incorrect Address / Location' },
  { value: 'scheduling_conflict',    label: 'Scheduling Conflict' },
  { value: 'pay_source_unclear',     label: 'Pay Source Unclear' },
  { value: 'mobility_needs_unclear', label: 'Mobility Needs Unclear' },
  { value: 'contact_unavailable',    label: 'Contact Unavailable' },
  { value: 'other',                  label: 'Other' },
]

const CANCEL_REASONS: { value: CancellationReason; label: string }[] = [
  { value: 'facility_canceled',   label: 'Facility Canceled' },
  { value: 'requestor_canceled',  label: 'Requestor Canceled' },
  { value: 'client_canceled',     label: 'Client Canceled' },
  { value: 'no_show',             label: 'No Show' },
  { value: 'appointment_changed', label: 'Appointment Changed' },
  { value: 'authorization_issue', label: 'Authorization Issue' },
  { value: 'duplicate_booking',   label: 'Duplicate Booking' },
  { value: 'operational_issue',   label: 'Operational Issue' },
  { value: 'arrived_cancel',      label: 'Arrived / Cancel' },
  { value: 'inclement_weather',   label: 'Inclement Weather' },
  { value: 'other',               label: 'Other' },
]

function stateBadge(s: ReviewState) {
  const map: Record<string, string> = {
    pending: 'pending', accepted: 'accepted', declined: 'declined',
    returned: 'returned', canceled: 'canceled', completed: 'completed', arrived_canceled: 'arrived_canceled',
  }
  return (map[s] ?? 'secondary') as Parameters<typeof Badge>[0]['variant']
}

function DataItem({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="text-sm font-medium text-gray-900 leading-snug">{value}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, iconBg, children }: {
  title: string; icon: React.ElementType; iconBg: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  )
}

export function TripDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc       = useQueryClient()
  const { data: trip, isLoading } = useTrip(id!)

  const reviewMutation = useReviewTrip()
  const cancelMutation = useCancelTrip()

  useEffect(() => {
    if (!supabase || !id) return
    const sb = supabase
    const channel = sb.channel(`trip-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['trip', id] })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [id, qc])

  const [reviewDialog, setReviewDialog]               = useState<'accept' | 'decline' | 'return' | null>(null)
  const [cancelDialog, setCancelDialog]               = useState(false)
  const [notifyDialog, setNotifyDialog]               = useState(false)
  const [declineReason, setDeclineReason]             = useState('')
  const [clarificationReason, setClarificationReason] = useState('')
  const [cancelReason, setCancelReason]               = useState('')
  const [notifyType, setNotifyType]                   = useState('trip_decision')
  const [reviewNotes, setReviewNotes]                 = useState('')
  const [actionError, setActionError]                 = useState<string | null>(null)
  const [notifySent, setNotifySent]                   = useState(false)
  const [actionSuccess, setActionSuccess]             = useState<string | null>(null)
  const [processingLabel, setProcessingLabel]         = useState<string | null>(null)

  const { data: facilities = [] } = useQuery<Facility[]>({ queryKey: ['facilities'],   queryFn: async () => (await facilitiesApi.list()).data })
  const { data: requestors = [] } = useQuery<Requestor[]>({ queryKey: ['requestors'],  queryFn: async () => (await requestorsApi.list()).data })
  const { data: clients    = [] } = useQuery<Client[]>({ queryKey: ['clients'],        queryFn: async () => (await clientsApi.list()).data })
  const { data: paySources = [] } = useQuery<PaySource[]>({ queryKey: ['pay-sources'], queryFn: async () => (await paySourcesApi.list()).data })

  if (isLoading) return (
    <div className="flex justify-center items-center py-32">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-brand-600" />
    </div>
  )
  if (!trip) return <div className="text-center py-32 text-gray-400 text-sm">Trip not found</div>

  const facility  = facilities.find((f) => f.id === trip.facility_id)
  const requestor = requestors.find((r) => r.id === trip.requestor_id)
  const client    = clients.find((c) => c.id === trip.client_id)
  const paySource = paySources.find((p) => p.id === trip.pay_source_id)

  const canReview = user?.role === 'senior_dispatcher' || user?.role === 'admin'
  const canCancel = canReview && ['pending', 'accepted'].includes(trip.review_state)
  const canAct    = canReview && trip.review_state === 'pending'
  const canNotify = canReview && ['accepted', 'declined', 'returned', 'canceled'].includes(trip.review_state)

  async function handleReview() {
    if (!reviewDialog || !id) return
    setActionError(null)
    setProcessingLabel(reviewDialog === 'accept' ? 'Accepting trip…' : reviewDialog === 'decline' ? 'Declining trip…' : 'Returning for clarification…')
    setReviewDialog(null)
    try {
      await reviewMutation.mutateAsync({
        id, action: reviewDialog,
        ...(reviewDialog === 'decline' && declineReason ? { decline_reason: declineReason } : {}),
        ...(reviewDialog === 'return' && clarificationReason ? { clarification_reason: clarificationReason } : {}),
        ...(reviewNotes ? { review_notes: reviewNotes } : {}),
      })
      setDeclineReason(''); setClarificationReason(''); setReviewNotes('')
      reviewMutation.reset()
      setActionSuccess(reviewDialog === 'accept' ? 'Trip accepted' : reviewDialog === 'decline' ? 'Trip declined' : 'Returned for clarification')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
      setReviewDialog(reviewDialog)
    } finally { setProcessingLabel(null) }
  }

  async function handleCancel() {
    if (!cancelReason || !id) return
    setActionError(null)
    setProcessingLabel('Canceling trip…')
    setCancelDialog(false)
    try {
      await cancelMutation.mutateAsync({ id, cancellation_reason: cancelReason, ...(reviewNotes ? { review_notes: reviewNotes } : {}) })
      setCancelReason(''); setReviewNotes('')
      cancelMutation.reset()
      setActionSuccess('Trip canceled')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Cancel failed')
      setCancelDialog(true)
    } finally { setProcessingLabel(null) }
  }

  async function handleNotify() {
    if (!id) return
    setNotifyDialog(false)
    setProcessingLabel('Sending notification…')
    try {
      await tripsApi.notify(id, { message_type: notifyType })
      setActionSuccess('Notification sent!')
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to send notification')
      setNotifyDialog(true)
    } finally { setProcessingLabel(null); setNotifySent(false) }
  }

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Processing overlay ── */}
      {processingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-100 border-t-brand-600" />
            <p className="text-sm font-semibold text-gray-700">{processingLabel}</p>
          </div>
        </div>
      )}

      {/* ── Success toast ── */}
      {actionSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* ── Hero header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={stateBadge(trip.review_state)} className="capitalize text-xs px-3 py-1">
                {trip.review_state.replace(/_/g, ' ')}
              </Badge>
              {trip.urgency_level !== 'standard' && (
                <Badge variant={trip.urgency_level === 'emergency' ? 'emergency' : 'urgent'} className="capitalize text-xs px-3 py-1">
                  {trip.urgency_level}
                </Badge>
              )}
              {trip.missing_info_flag && (
                <span className="inline-flex items-center gap-1.5 text-amber-700 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  <AlertTriangle className="h-3 w-3" /> Missing Info
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canAct && (<>
              <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 gap-1.5" onClick={() => setReviewDialog('accept')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Accept
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setReviewDialog('decline')}>
                Decline
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setReviewDialog('return')}>
                Return for Clarification
              </Button>
            </>)}
            {canCancel && (
              <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setCancelDialog(true)}>
                Cancel Trip
              </Button>
            )}
            {canNotify && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setNotifyDialog(true)}>
                <Bell className="h-3.5 w-3.5" /> Notify
              </Button>
            )}
          </div>
        </div>

        {/* Key trip summary row */}
        <div className="mt-3 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Trip Date</p>
            <p className="text-lg font-bold text-gray-900 leading-tight">{formatDate(trip.trip_date)}</p>
          </div>
          {client && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Client</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{client.full_name}</p>
            </div>
          )}
          {facility && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Facility</p>
              <p className="text-base font-semibold text-gray-700 leading-tight">{facility.name}</p>
            </div>
          )}
          {formatTime(trip.appointment_time) && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Appt Time</p>
              <p className="text-base font-semibold text-gray-700 leading-tight">{formatTime(trip.appointment_time)}</p>
            </div>
          )}
          {trip.trip_order_id && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Order ID</p>
              <p className="text-base font-mono font-semibold text-gray-700 leading-tight">{trip.trip_order_id}</p>
            </div>
          )}
        </div>

        {/* Review result bar */}
        {trip.reviewed_at && (
          <div className={`mt-3 rounded-xl px-4 py-2.5 text-sm border flex items-center justify-between gap-4 ${
            trip.review_state === 'accepted' ? 'bg-green-50 border-green-200 text-green-800' :
            trip.review_state === 'declined' ? 'bg-red-50 border-red-200 text-red-800' :
            trip.review_state === 'returned' ? 'bg-blue-50 border-blue-200 text-blue-800' :
            'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <strong className="capitalize">{trip.review_state.replace(/_/g, ' ')}</strong>
              {trip.decline_reason && <span className="opacity-70 capitalize">· {trip.decline_reason.replace(/_/g, ' ')}</span>}
              {trip.cancellation_reason && <span className="opacity-70 capitalize">· {trip.cancellation_reason.replace(/_/g, ' ')}</span>}
              {trip.review_notes && <span className="opacity-70">· "{trip.review_notes}"</span>}
            </div>
            <span className="text-xs opacity-50 whitespace-nowrap shrink-0">{formatDateTime(trip.reviewed_at)}</span>
          </div>
        )}

        {/* Internal warning */}
        {trip.internal_warning && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
            <span><strong>Warning:</strong> {trip.internal_warning}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 p-6 space-y-4">

        {/* Row 1 — Client · Requestor · Facility */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <SectionCard title="Client" icon={User} iconBg="bg-brand-100 text-brand-600">
            {client ? (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-bold text-gray-900 leading-tight">{client.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize mt-0.5">
                    {client.mobility_level ?? 'No mobility info'}
                    {trip.escort_needed && <span className="ml-2 text-amber-600 font-semibold">· Escort needed</span>}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DataItem icon={Calendar} label="Date of Birth" value={client.date_of_birth ? formatDate(client.date_of_birth) : null} />
                  <DataItem icon={Phone}    label="Phone"         value={client.phone} />
                  <DataItem icon={MapPin}   label="Address"       value={client.primary_address} />
                </div>
                {client.special_assistance_notes && (
                  <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                    {client.special_assistance_notes}
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-gray-400">Client not found</p>}
          </SectionCard>

          <SectionCard title="Requestor" icon={User} iconBg="bg-blue-100 text-blue-600">
            {requestor ? (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-bold text-gray-900 leading-tight">{requestor.name}</p>
                  {requestor.title_department && <p className="text-xs text-gray-400 mt-0.5">{requestor.title_department}</p>}
                  <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                    Notify via {requestor.preferred_notification_method}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DataItem icon={Phone} label="Phone" value={requestor.phone} />
                  <DataItem icon={Mail}  label="Email" value={requestor.email} />
                  {trip.callback_phone && <DataItem icon={Phone} label="Callback Phone" value={trip.callback_phone} />}
                  {trip.reply_email    && <DataItem icon={Mail}  label="Reply Email"    value={trip.reply_email} />}
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">Requestor not found</p>}
          </SectionCard>

          <SectionCard title="Facility" icon={Building2} iconBg="bg-purple-100 text-purple-600">
            {facility ? (
              <div className="space-y-4">
                <div>
                  <p className="text-base font-bold text-gray-900 leading-tight">{facility.name}</p>
                  {facility.facility_type && (
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{facility.facility_type.replace(/_/g, ' ')}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DataItem icon={MapPin}    label="Address"    value={facility.address} />
                  <DataItem icon={Phone}     label="Phone"      value={facility.phone} />
                  <DataItem icon={Mail}      label="Email"      value={facility.email} />
                  <DataItem icon={CreditCard} label="Pay Source" value={paySource?.name} />
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">Facility not found</p>}
          </SectionCard>
        </div>

        {/* Row 2 — Trip Details · Addresses · Billing · Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">

          <SectionCard title="Trip Details" icon={Car} iconBg="bg-gray-100 text-gray-500">
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DataItem icon={Calendar} label="Trip Date"      value={formatDate(trip.trip_date)} />
              <DataItem icon={Clock}    label="Appt Time"      value={formatTime(trip.appointment_time)} />
              <DataItem icon={Clock}    label="Pickup Time"    value={formatTime(trip.requested_pickup_time)} />
              <DataItem icon={Clock}    label="Return Time"    value={formatTime(trip.return_time)} />
              <DataItem label="Trip Type"      value={trip.trip_type?.replace(/_/g, ' ')} />
              <DataItem label="Appt Type"      value={trip.appointment_type} />
              <DataItem label="Channel"        value={trip.intake_channel} />
              <DataItem label="Mobility"       value={trip.mobility_level} />
              {trip.will_call     && <DataItem label="Will Call"     value="Yes" />}
              {trip.escort_needed && <DataItem label="Escort"        value="Required" />}
              <DataItem label="Return Details" value={trip.return_details} />
            </div>
          </SectionCard>

          <SectionCard title="Addresses" icon={MapPin} iconBg="bg-green-100 text-green-600">
            <div className="space-y-4">
              <DataItem icon={MapPin} label="Pickup Address"    value={trip.pickup_address} />
              <DataItem icon={MapPin} label="Drop-off Location" value={trip.dropoff_location_name} />
              <DataItem icon={MapPin} label="Drop-off Address"  value={trip.dropoff_address} />
              <DataItem label="Drop-off Notes"  value={trip.dropoff_notes} />
              <DataItem label="Special Notes"   value={trip.special_notes} />
            </div>
          </SectionCard>

          <SectionCard title="Billing" icon={CreditCard} iconBg="bg-emerald-100 text-emerald-600">
            <div className="space-y-4">
              <DataItem icon={CreditCard} label="Pay Source"       value={paySource?.name} />
              <DataItem icon={Hash}       label="Trip Order ID"    value={trip.trip_order_id} />
              <div className="grid grid-cols-2 gap-4">
                <DataItem label="Expected Revenue" value={formatCurrency(trip.expected_revenue)} />
                <DataItem label="Final Revenue"    value={formatCurrency(trip.final_revenue)} />
              </div>
              <DataItem label="Billing Notes" value={trip.billing_notes} />
              <DataItem label="Intake Date"   value={formatDate(trip.intake_date)} />
            </div>
          </SectionCard>

          <SectionCard title="Dispatch Notes" icon={FileText} iconBg="bg-orange-100 text-orange-600">
            <div className="space-y-4">
              {trip.intake_notes ? (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Dispatch Notes</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{trip.intake_notes}</p>
                </div>
              ) : null}
              {trip.review_notes ? (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Review Notes</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{trip.review_notes}</p>
                </div>
              ) : null}
              {trip.internal_warning ? (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700">
                  <span className="font-semibold">Warning:</span> {trip.internal_warning}
                </div>
              ) : null}
              {!trip.intake_notes && !trip.review_notes && !trip.internal_warning && (
                <p className="text-sm text-gray-400">No notes recorded</p>
              )}
            </div>
          </SectionCard>

        </div>
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewDialog !== null} onOpenChange={(o) => !o && setReviewDialog(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog === 'accept'  && 'Accept Trip'}
              {reviewDialog === 'decline' && 'Decline Trip'}
              {reviewDialog === 'return'  && 'Return for Clarification'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {reviewDialog === 'decline' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Decline Reason *</Label>
                <Select value={declineReason} onValueChange={setDeclineReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>{DECLINE_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {reviewDialog === 'return' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Clarification Reason *</Label>
                <Select value={clarificationReason} onValueChange={setClarificationReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>{CLARIFICATION_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</Label>
              <Textarea placeholder="Add notes…" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="resize-none" />
            </div>
            {actionError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{actionError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              size="sm" onClick={handleReview}
              disabled={reviewMutation.isPending || (reviewDialog === 'decline' && !declineReason) || (reviewDialog === 'return' && !clarificationReason)}
              className={reviewDialog === 'accept' ? 'bg-green-600 hover:bg-green-700' : reviewDialog === 'decline' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {reviewMutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Cancel Trip</DialogTitle></DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cancellation Reason *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                <SelectContent>{CANCEL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</Label>
              <Textarea placeholder="Add notes…" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="resize-none" />
            </div>
            {actionError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{actionError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelDialog(false)}>Close</Button>
            <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending || !cancelReason}>
              {cancelMutation.isPending ? 'Canceling…' : 'Cancel Trip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Notify Dialog ── */}
      <Dialog open={notifyDialog} onOpenChange={setNotifyDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {requestor && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 space-y-1">
                <p className="font-semibold text-gray-800 text-sm">{requestor.name}</p>
                <p className="text-xs text-gray-500">Notify via: <span className="font-medium capitalize">{requestor.preferred_notification_method}</span></p>
                {requestor.phone && <p className="text-xs text-gray-400">{requestor.phone}</p>}
                {requestor.email && <p className="text-xs text-gray-400">{requestor.email}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notification Type</Label>
              <Select value={notifyType} onValueChange={setNotifyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trip_decision">Trip Decision</SelectItem>
                  <SelectItem value="trip_canceled">Trip Canceled</SelectItem>
                  <SelectItem value="manual_alert">Manual / Ad-hoc Alert</SelectItem>
                  <SelectItem value="general_service_alert">General Service Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700">
              <strong>Preview (SMS):</strong> "Your trip request (ID: {id?.slice(0, 8)}…) status has been updated."
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotifyDialog(false)}>Close</Button>
            <Button size="sm" onClick={handleNotify} disabled={notifySent} className="gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
