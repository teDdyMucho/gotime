import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTrip } from '@/hooks/useTrips'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { facilitiesApi, requestorsApi, clientsApi, paySourcesApi } from '@/lib/api'
import type { Facility, Requestor, Client, PaySource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

const schema = z.object({
  intake_channel: z.enum(['phone', 'email', 'fax', 'portal', 'internal']),
  requestor_id: z.string().uuid('Select a requestor'),
  facility_id: z.string().uuid('Select a facility'),
  callback_phone: z.string().optional(),
  reply_email: z.string().email().optional().or(z.literal('')),
  client_id: z.string().uuid('Select a client'),
  pickup_address: z.string().optional(),
  dropoff_address: z.string().optional(),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
  escort_needed: z.boolean(),
  special_notes: z.string().optional(),
  trip_date: z.string().min(1, 'Trip date is required'),
  appointment_time: z.string().optional(),
  requested_pickup_time: z.string().optional(),
  will_call: z.boolean(),
  trip_type: z.enum(['one_way', 'round_trip', 'multi_trip']),
  return_details: z.string().optional(),
  urgency_level: z.enum(['standard', 'urgent', 'emergency']),
  appointment_type: z.string().optional(),
  pay_source_id: z.string().uuid().optional().or(z.literal('')),
  expected_revenue: z.number().nonnegative().optional(),
  trip_order_id: z.string().optional(),
  billing_notes: z.string().optional(),
  priority_category: z.string().optional(),
  intake_notes: z.string().optional(),
  missing_info_flag: z.boolean(),
  internal_warning: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function FormField({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ---- Quick-add Client schema ----
const quickClientSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
})
type QuickClientForm = z.infer<typeof quickClientSchema>

// ---- Quick-add Requestor schema ----
const quickRequestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title_department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  preferred_notification_method: z.enum(['sms', 'email', 'both']),
})
type QuickRequestorForm = z.infer<typeof quickRequestorSchema>

export function IntakeForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const createTrip = useCreateTrip()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [quickClientOpen, setQuickClientOpen] = useState(false)
  const [quickRequestorOpen, setQuickRequestorOpen] = useState(false)

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list({ status: 'active' })).data,
  })
  const { data: requestors = [] } = useQuery<Requestor[]>({
    queryKey: ['requestors'],
    queryFn: async () => (await requestorsApi.list({ status: 'active' })).data,
  })
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await clientsApi.list()).data,
  })
  const { data: paySources = [] } = useQuery<PaySource[]>({
    queryKey: ['pay-sources'],
    queryFn: async () => (await paySourcesApi.list({ status: 'active' })).data,
  })

  // Quick-add mutations
  const quickClientMutation = useMutation({
    mutationFn: async (data: QuickClientForm) => (await clientsApi.create(data)).data as Client,
    onSuccess: (newClient) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setValue('client_id', newClient.id)
      setQuickClientOpen(false)
    },
  })

  const quickRequestorMutation = useMutation({
    mutationFn: async (data: QuickRequestorForm & { facility_id: string }) =>
      (await requestorsApi.create({ ...data, status: 'active' })).data as Requestor,
    onSuccess: (newRequestor) => {
      qc.invalidateQueries({ queryKey: ['requestors'] })
      setValue('requestor_id', newRequestor.id)
      setQuickRequestorOpen(false)
    },
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      intake_channel: 'phone',
      trip_type: 'one_way',
      urgency_level: 'standard',
      escort_needed: false,
      will_call: false,
      missing_info_flag: false,
    },
  })

  const {
    register: regClient,
    handleSubmit: handleClient,
    control: controlClient,
    reset: resetClient,
    formState: { errors: clientErrors, isSubmitting: clientSubmitting },
  } = useForm<QuickClientForm>({ resolver: zodResolver(quickClientSchema) })

  const {
    register: regRequestor,
    handleSubmit: handleRequestor,
    reset: resetRequestor,
    formState: { errors: requestorErrors, isSubmitting: requestorSubmitting },
  } = useForm<QuickRequestorForm>({
    resolver: zodResolver(quickRequestorSchema),
    defaultValues: { preferred_notification_method: 'email' },
  })

  const facilityId = watch('facility_id')
  const tripType = watch('trip_type')

  // Auto-fill pay source from facility default
  useEffect(() => {
    const facility = facilities.find((f) => f.id === facilityId)
    if (facility?.default_pay_source_id) {
      setValue('pay_source_id', facility.default_pay_source_id)
    }
  }, [facilityId, facilities, setValue])

  const filteredRequestors = facilityId
    ? requestors.filter((r) => r.facility_id === facilityId)
    : requestors

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        pay_source_id: data.pay_source_id || undefined,
        reply_email: data.reply_email || undefined,
      }
      const res = await createTrip.mutateAsync(payload)
      navigate(`/trips/${(res.data as { id: string }).id}`)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create trip')
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">New Trip Request</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section: Intake Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Intake Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Intake Channel" required error={errors.intake_channel?.message}>
              <Controller name="intake_channel" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['phone', 'email', 'fax', 'portal', 'internal'].map((v) => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Facility" required error={errors.facility_id?.message}>
              <Controller name="facility_id" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select facility…" /></SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Requestor" required error={errors.requestor_id?.message}>
              <div className="flex gap-1.5">
                <Controller name="requestor_id" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select requestor…" /></SelectTrigger>
                    <SelectContent>
                      {filteredRequestors.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                <Button
                  type="button" variant="outline" size="icon"
                  title="Quick-add requestor"
                  onClick={() => { resetRequestor({ preferred_notification_method: 'email' }); setQuickRequestorOpen(true) }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormField>

            <FormField label="Callback Phone" error={errors.callback_phone?.message}>
              <Input {...register('callback_phone')} placeholder="(555) 000-0000" />
            </FormField>

            <FormField label="Reply Email" error={errors.reply_email?.message}>
              <Input {...register('reply_email')} type="email" placeholder="requestor@facility.org" />
            </FormField>
          </CardContent>
        </Card>

        {/* Section: Client */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Client" required error={errors.client_id?.message}>
              <div className="flex gap-1.5">
                <Controller name="client_id" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select client…" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                <Button
                  type="button" variant="outline" size="icon"
                  title="Quick-add client"
                  onClick={() => { resetClient({}); setQuickClientOpen(true) }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormField>

            <FormField label="Mobility Level" error={errors.mobility_level?.message}>
              <Controller name="mobility_level" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['ambulatory', 'wheelchair', 'stretcher', 'other'].map((v) => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Pickup Address" error={errors.pickup_address?.message}>
              <Input {...register('pickup_address')} placeholder="123 Main St, City, ST 00000" />
            </FormField>

            <FormField label="Dropoff Address" error={errors.dropoff_address?.message}>
              <Input {...register('dropoff_address')} placeholder="456 Medical Center Dr" />
            </FormField>

            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="escort" {...register('escort_needed')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
              <Label htmlFor="escort">Escort Needed</Label>
            </div>

            <FormField label="Special Notes" error={errors.special_notes?.message}>
              <Textarea {...register('special_notes')} rows={2} placeholder="Mobility aids, access notes…" />
            </FormField>
          </CardContent>
        </Card>

        {/* Section: Trip Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trip Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Trip Date" required error={errors.trip_date?.message}>
              <Input type="date" {...register('trip_date')} />
            </FormField>

            <FormField label="Appointment Time" error={errors.appointment_time?.message}>
              <Input type="time" {...register('appointment_time')} />
            </FormField>

            <FormField label="Requested Pickup Time" error={errors.requested_pickup_time?.message}>
              <Input type="time" {...register('requested_pickup_time')} />
            </FormField>

            <FormField label="Trip Type" required error={errors.trip_type?.message}>
              <Controller name="trip_type" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                    <SelectItem value="multi_trip">Multi Trip</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Urgency Level" required error={errors.urgency_level?.message}>
              <Controller name="urgency_level" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Appointment Type" error={errors.appointment_type?.message}>
              <Input {...register('appointment_type')} placeholder="e.g. Dialysis, Oncology" />
            </FormField>

            {(tripType === 'round_trip' || tripType === 'multi_trip') && (
              <FormField label="Return Details" error={errors.return_details?.message}>
                <Textarea {...register('return_details')} rows={2} placeholder="Return time or instructions…" />
              </FormField>
            )}

            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="will_call" {...register('will_call')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
              <Label htmlFor="will_call">Will Call</Label>
            </div>
          </CardContent>
        </Card>

        {/* Section: Billing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Pay Source" error={errors.pay_source_id?.message}>
              <Controller name="pay_source_id" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select pay source…" /></SelectTrigger>
                  <SelectContent>
                    {paySources.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Expected Revenue ($)" error={errors.expected_revenue?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('expected_revenue', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="Trip Order ID" error={errors.trip_order_id?.message}>
              <Input {...register('trip_order_id')} placeholder="External order reference" />
            </FormField>

            <FormField label="Priority Category" error={errors.priority_category?.message}>
              <Input {...register('priority_category')} placeholder="e.g. VIP, Standard" />
            </FormField>

            <FormField label="Billing Notes" error={errors.billing_notes?.message}>
              <Textarea {...register('billing_notes')} rows={2} placeholder="Auth codes, billing instructions…" />
            </FormField>
          </CardContent>
        </Card>

        {/* Section: Internal Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Intake Notes" error={errors.intake_notes?.message}>
              <Textarea {...register('intake_notes')} rows={3} placeholder="Notes from intake call…" />
            </FormField>

            <FormField label="Internal Warning" error={errors.internal_warning?.message}>
              <Textarea {...register('internal_warning')} rows={3} placeholder="Flags or warnings for dispatcher…" />
            </FormField>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="missing_info" {...register('missing_info_flag')} className="h-4 w-4 rounded border-gray-300 accent-amber-500" />
              <Label htmlFor="missing_info">Missing Info Flag</Label>
            </div>
          </CardContent>
        </Card>

        {submitError && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit Trip Request'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Quick-add Client Dialog */}
      <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Quick-Add Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleClient(async (data) => quickClientMutation.mutateAsync(data))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input {...regClient('full_name')} autoFocus />
              {clientErrors.full_name && <p className="text-xs text-red-500">{clientErrors.full_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" {...regClient('date_of_birth')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...regClient('phone')} placeholder="(555) 000-0000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mobility Level</Label>
              <Controller name="mobility_level" control={controlClient} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {['ambulatory', 'wheelchair', 'stretcher', 'other'].map((v) => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </div>
            {quickClientMutation.isError && (
              <p className="text-xs text-red-500">Failed to create client</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickClientOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={clientSubmitting}>
                {clientSubmitting ? 'Creating…' : 'Create & Select'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick-add Requestor Dialog */}
      <Dialog open={quickRequestorOpen} onOpenChange={setQuickRequestorOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Quick-Add Requestor</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleRequestor(async (data) => {
              if (!facilityId) return
              quickRequestorMutation.mutateAsync({ ...data, facility_id: facilityId })
            })}
            className="space-y-3"
          >
            {!facilityId && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                Select a facility first — new requestor will be linked to it.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...regRequestor('name')} autoFocus />
              {requestorErrors.name && <p className="text-xs text-red-500">{requestorErrors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title / Dept</Label>
                <Input {...regRequestor('title_department')} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...regRequestor('phone')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...regRequestor('email')} type="email" />
            </div>
            {quickRequestorMutation.isError && (
              <p className="text-xs text-red-500">Failed to create requestor</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickRequestorOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={requestorSubmitting || !facilityId}>
                {requestorSubmitting ? 'Creating…' : 'Create & Select'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
