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
import { ArrowLeft, AlertTriangle, Bell, Phone, Mail, MapPin, Calendar, User, Building2, CreditCard, CheckCircle2 } from 'lucide-react'
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

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-sm text-gray-800 font-medium leading-tight mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value == null || value === '' || value === false) return null
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800">{String(value)}</dd>
    </div>
  )
}

export function TripDetail() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const qc          = useQueryClient()
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

  const [reviewDialog, setReviewDialog]             = useState<'accept' | 'decline' | 'return' | null>(null)
  const [cancelDialog, setCancelDialog]             = useState(false)
  const [notifyDialog, setNotifyDialog]             = useState(false)
  const [declineReason, setDeclineReason]           = useState('')
  const [clarificationReason, setClarificationReason] = useState('')
  const [cancelReason, setCancelReason]             = useState('')
  const [notifyType, setNotifyType]                 = useState('trip_decision')
  const [reviewNotes, setReviewNotes]               = useState('')
  const [actionError, setActionError]               = useState<string | null>(null)
  const [notifySent, setNotifySent]                 = useState(false)
  const [actionSuccess, setActionSuccess]           = useState<string | null>(null)
  const [processingLabel, setProcessingLabel]       = useState<string | null>(null)

  const { data: facilities = [] } = useQuery<Facility[]>({ queryKey: ['facilities'],   queryFn: async () => (await facilitiesApi.list()).data })
  const { data: requestors = [] } = useQuery<Requestor[]>({ queryKey: ['requestors'],  queryFn: async () => (await requestorsApi.list()).data })
  const { data: clients    = [] } = useQuery<Client[]>({ queryKey: ['clients'],        queryFn: async () => (await clientsApi.list()).data })
  const { data: paySources = [] } = useQuery<PaySource[]>({ queryKey: ['pay-sources'], queryFn: async () => (await paySourcesApi.list()).data })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-brand-600" />
    </div>
  )
  if (!trip) return <div className="text-center py-20 text-gray-400">Trip not found</div>

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
    const label = reviewDialog === 'accept' ? 'Accepting trip…' : reviewDialog === 'decline' ? 'Declining trip…' : 'Returning for clarification…'
    setProcessingLabel(label)
    setReviewDialog(null)
    try {
      await reviewMutation.mutateAsync({
        id,
        action: reviewDialog,
        ...(reviewDialog === 'decline' && declineReason ? { decline_reason: declineReason } : {}),
        ...(reviewDialog === 'return' && clarificationReason ? { clarification_reason: clarificationReason } : {}),
        ...(reviewNotes ? { review_notes: reviewNotes } : {}),
      })
      setDeclineReason(''); setClarificationReason(''); setReviewNotes('')
      reviewMutation.reset()
      setActionSuccess(
        reviewDialog === 'accept' ? 'Trip accepted' :
        reviewDialog === 'decline' ? 'Trip declined' : 'Returned for clarification'
      )
      setTimeout(() => setActionSuccess(null), 3000)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
      setReviewDialog(reviewDialog)
    } finally {
      setProcessingLabel(null)
    }
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
    } finally {
      setProcessingLabel(null)
    }
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
    } finally {
      setProcessingLabel(null)
      setNotifySent(false)
    }
  }

  const isProcessing = processingLabel !== null

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[240px]">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-gray-100 border-t-brand-600" />
            <p className="text-sm font-semibold text-gray-700">{processingLabel}</p>
          </div>
        </div>
      )}

      {/* Success toast */}
      {actionSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 text-xs text-gray-500 -ml-1">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>
        <div className="h-4 w-px bg-gray-200" />
        <Badge variant={stateBadge(trip.review_state)} className="capitalize">
          {trip.review_state.replace(/_/g, ' ')}
        </Badge>
        {trip.missing_info_flag && (
          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
            <AlertTriangle className="h-3 w-3" /> Missing Info
          </span>
        )}
        {trip.urgency_level !== 'standard' && (
          <Badge variant={trip.urgency_level === 'emergency' ? 'emergency' : 'urgent'} className="capitalize">
            {trip.urgency_level}
          </Badge>
        )}
      </div>

      {/* Internal warning */}
      {trip.internal_warning && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          <span><strong>Internal Warning:</strong> {trip.internal_warning}</span>
        </div>
      )}

      {/* Action bar */}
      {(canAct || canCancel || canNotify) && (
        <div className="flex gap-2 flex-wrap">
          {canAct && (<>
            <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700" onClick={() => setReviewDialog('accept')}>
              Accept Trip
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
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setNotifyDialog(true)}>
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Send Notification
            </Button>
          )}
        </div>
      )}

      {/* Review result bar */}
      {trip.reviewed_at && (
        <div className={`rounded-xl px-4 py-3 text-sm border flex items-start gap-2 ${
          trip.review_state === 'accepted' ? 'bg-green-50 border-green-200 text-green-800' :
          trip.review_state === 'declined' ? 'bg-red-50 border-red-200 text-red-800' :
          trip.review_state === 'returned' ? 'bg-blue-50 border-blue-200 text-blue-800' :
          'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <div className="flex-1">
            <strong className="capitalize">{trip.review_state.replace(/_/g, ' ')}</strong>
            {trip.decline_reason && <> · <span className="capitalize">{trip.decline_reason.replace(/_/g, ' ')}</span></>}
            {trip.cancellation_reason && <> · <span className="capitalize">{trip.cancellation_reason.replace(/_/g, ' ')}</span></>}
            {trip.review_notes && <> · "{trip.review_notes}"</>}
          </div>
          <span className="text-xs opacity-60 whitespace-nowrap">{formatDateTime(trip.reviewed_at)}</span>
        </div>
      )}

      {/* Entity cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-brand-100 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Client</span>
          </div>
          <div className="p-4 space-y-3">
            {client ? (<>
              <div>
                <p className="font-semibold text-gray-900">{client.full_name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">
                  {client.mobility_level ?? 'No mobility info'}
                  {trip.escort_needed && <span className="ml-2 text-amber-600 font-semibold">· Escort needed</span>}
                </p>
              </div>
              <InfoRow icon={Calendar} label="Date of Birth" value={client.date_of_birth ? formatDate(client.date_of_birth) : null} />
              <InfoRow icon={Phone}    label="Phone"         value={client.phone} />
              <InfoRow icon={MapPin}   label="Address"       value={client.primary_address} />
              {client.special_assistance_notes && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">{client.special_assistance_notes}</p>
              )}
            </>) : <p className="text-sm text-gray-400">Client not found</p>}
          </div>
        </div>

        {/* Requestor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Requestor</span>
          </div>
          <div className="p-4 space-y-3">
            {requestor ? (<>
              <div>
                <p className="font-semibold text-gray-900">{requestor.name}</p>
                {requestor.title_department && <p className="text-xs text-gray-400 mt-0.5">{requestor.title_department}</p>}
                <p className="text-xs text-gray-400 mt-0.5 capitalize">Notify via {requestor.preferred_notification_method}</p>
              </div>
              <InfoRow icon={Phone} label="Phone" value={requestor.phone} />
              <InfoRow icon={Mail}  label="Email" value={requestor.email} />
              {trip.callback_phone && <InfoRow icon={Phone} label="Callback Phone" value={trip.callback_phone} />}
              {trip.reply_email    && <InfoRow icon={Mail}  label="Reply Email"    value={trip.reply_email} />}
            </>) : <p className="text-sm text-gray-400">Requestor not found</p>}
          </div>
        </div>

        {/* Facility */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Facility</span>
          </div>
          <div className="p-4 space-y-3">
            {facility ? (<>
              <div>
                <p className="font-semibold text-gray-900">{facility.name}</p>
                {facility.facility_type && <p className="text-xs text-gray-400 capitalize mt-0.5">{facility.facility_type.replace(/_/g, ' ')}</p>}
              </div>
              <InfoRow icon={MapPin} label="Address" value={facility.address} />
              <InfoRow icon={Phone}  label="Phone"   value={facility.phone} />
              <InfoRow icon={Mail}   label="Email"   value={facility.email} />
              {paySource && (
                <InfoRow icon={CreditCard} label="Pay Source" value={paySource.name} />
              )}
            </>) : <p className="text-sm text-gray-400">Facility not found</p>}
          </div>
        </div>
      </div>

      {/* Trip detail cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Trip Details</p>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Trip Date"      value={formatDate(trip.trip_date)} />
              <Field label="Appt Time"      value={formatTime(trip.appointment_time)} />
              <Field label="Pickup Time"    value={formatTime(trip.requested_pickup_time)} />
              <Field label="Trip Type"      value={trip.trip_type.replace(/_/g, ' ')} />
              <Field label="Appt Type"      value={trip.appointment_type} />
              <Field label="Intake Channel" value={trip.intake_channel} />
              <Field label="Will Call"      value={trip.will_call ? 'Yes' : undefined} />
              <Field label="Escort Needed"  value={trip.escort_needed ? 'Yes' : undefined} />
              <Field label="Return Time"    value={formatTime(trip.return_time)} />
              <Field label="Return Details" value={trip.return_details} />
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Addresses</p>
          </div>
          <div className="p-4">
            <dl className="space-y-3">
              <Field label="Pickup Address"    value={trip.pickup_address} />
              <Field label="Drop-Off Location" value={trip.dropoff_location_name} />
              <Field label="Dropoff Address"   value={trip.dropoff_address} />
              <Field label="Dropoff Notes"     value={trip.dropoff_notes} />
              <Field label="Mobility Level"    value={trip.mobility_level} />
              <Field label="Special Notes"     value={trip.special_notes} />
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Billing</p>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Pay Source"       value={paySource?.name} />
              <Field label="Expected Revenue" value={formatCurrency(trip.expected_revenue)} />
              <Field label="Final Revenue"    value={formatCurrency(trip.final_revenue)} />
              <Field label="Trip Order ID"    value={trip.trip_order_id} />
              <Field label="Billing Notes"    value={trip.billing_notes} />
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Dispatch Notes</p>
          </div>
          <div className="p-4">
            <dl className="space-y-3">
              <Field label="Dispatch Notes"   value={trip.intake_notes} />
              <Field label="Internal Warning" value={trip.internal_warning} />
              <Field label="Review Notes"     value={trip.review_notes} />
              <Field label="Intake Date"      value={formatDate(trip.intake_date)} />
            </dl>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog !== null} onOpenChange={(o) => !o && setReviewDialog(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewDialog === 'accept'  && 'Accept Trip'}
              {reviewDialog === 'decline' && 'Decline Trip'}
              {reviewDialog === 'return'  && 'Return for Clarification'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {reviewDialog === 'decline' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Decline Reason *</Label>
                <Select value={declineReason} onValueChange={setDeclineReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>{DECLINE_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {reviewDialog === 'return' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Clarification Reason *</Label>
                <Select value={clarificationReason} onValueChange={setClarificationReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                  <SelectContent>{CLARIFICATION_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes (optional)</Label>
              <Textarea placeholder="Add notes…" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="resize-none" />
            </div>
            {actionError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{actionError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleReview}
              disabled={
                reviewMutation.isPending ||
                (reviewDialog === 'decline' && !declineReason) ||
                (reviewDialog === 'return' && !clarificationReason)
              }
              className={
                reviewDialog === 'accept'  ? 'bg-green-600 hover:bg-green-700' :
                reviewDialog === 'decline' ? 'bg-red-600 hover:bg-red-700' : ''
              }
            >
              {reviewMutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Cancel Trip</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Cancellation Reason *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
                <SelectContent>{CANCEL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes (optional)</Label>
              <Textarea placeholder="Add notes…" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={3} className="resize-none" />
            </div>
            {actionError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600">{actionError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelDialog(false)}>Close</Button>
            <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending || !cancelReason}>
              {cancelMutation.isPending ? 'Canceling…' : 'Cancel Trip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Dialog */}
      <Dialog open={notifyDialog} onOpenChange={setNotifyDialog}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Send Notification</DialogTitle></DialogHeader>
          <div className="space-y-4 py-1">
            {requestor && (
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-gray-800">{requestor.name}</p>
                <p className="text-xs text-gray-500">Notify via: <span className="font-medium capitalize">{requestor.preferred_notification_method}</span></p>
                {requestor.phone && <p className="text-xs text-gray-500">{requestor.phone}</p>}
                {requestor.email && <p className="text-xs text-gray-500">{requestor.email}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notification Type</Label>
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
              <strong>Preview (SMS):</strong> "Your trip request (ID: {id?.slice(0, 8)}…) status has been updated. Contact us for details."
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNotifyDialog(false)}>Close</Button>
            <Button size="sm" onClick={handleNotify} disabled={notifySent}>
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
