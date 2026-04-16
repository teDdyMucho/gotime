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
import { Combobox } from '@/components/ui/combobox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  intake_channel: z.enum(['phone', 'email', 'fax', 'portal', 'internal']),
  requestor_id: z.string().uuid('Select a requestor'),
  facility_id: z.string().uuid().optional().or(z.literal('')),
  callback_phone: z.string().optional(),
  reply_email: z.string().email().optional().or(z.literal('')),
  client_id: z.string().uuid('Select a client'),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
  special_notes: z.string().optional(),
  // Trip Details
  trip_date: z.string().min(1, 'Trip date is required'),
  requested_pickup_time: z.string().optional(),
  dropoff_location_name: z.string().optional(),
  dropoff_address: z.string().optional(),
  appointment_time: z.string().optional(),
  appointment_type: z.string().optional(),
  dropoff_notes: z.string().optional(),
  trip_type: z.enum(['one_way', 'round_trip', 'multi_trip']),
  return_time: z.string().optional(),
  urgency_level: z.enum(['standard', 'urgent', 'emergency']),
  escort_needed: z.boolean(),
  will_call: z.boolean(),
  // Billing
  pay_source_id: z.string().uuid().optional().or(z.literal('')),
  expected_revenue: z.number().nonnegative().optional(),
  trip_order_id: z.string().optional(),
  billing_notes: z.string().optional(),
  // Internal
  intake_notes: z.string().optional(),
  missing_info_flag: z.boolean(),
  internal_warning: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// Extra leg for multi-trip
interface TripLeg {
  dropoff_location_name: string
  dropoff_address: string
  appointment_time: string
  appointment_type: string
  dropoff_notes: string
}

function newLeg(): TripLeg {
  return { dropoff_location_name: '', dropoff_address: '', appointment_time: '', appointment_type: '', dropoff_notes: '' }
}

function FormField({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ── Quick-add schemas ──────────────────────────────────────────────────────────

const quickClientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().optional(),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
})
type QuickClientForm = z.infer<typeof quickClientSchema>

const quickRequestorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title_department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  preferred_notification_method: z.enum(['sms', 'email', 'both']),
  facility_id: z.string().optional(),
})
type QuickRequestorForm = z.infer<typeof quickRequestorSchema>

const quickFacilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
})
type QuickFacilityForm = z.infer<typeof quickFacilitySchema>

// ── Component ─────────────────────────────────────────────────────────────────

export function IntakeForm() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const createTrip = useCreateTrip()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [quickClientOpen, setQuickClientOpen] = useState(false)
  const [quickRequestorOpen, setQuickRequestorOpen] = useState(false)
  const [quickFacilityOpen, setQuickFacilityOpen] = useState(false)
  const [quickFacilityFor, setQuickFacilityFor] = useState<'intake' | 'requestor'>('intake')
  const [additionalLegs, setAdditionalLegs] = useState<TripLeg[]>([])

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list({ status: 'active' })).data,
  })
  const { data: allRequestors = [] } = useQuery<Requestor[]>({
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

  // ── Mutations ──────────────────────────────────────────────────────────────

  const quickClientMutation = useMutation({
    mutationFn: async (data: QuickClientForm) => {
      const full_name = `${data.first_name} ${data.last_name}`.trim()
      return (await clientsApi.create({ ...data, full_name })).data as Client
    },
    onSuccess: (newClient) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setValue('client_id', newClient.id)
      setQuickClientOpen(false)
      resetClient({})
    },
  })

  const quickRequestorMutation = useMutation({
    mutationFn: async (data: QuickRequestorForm) =>
      (await requestorsApi.create({ ...data, status: 'active' })).data as Requestor,
    onSuccess: (newRequestor) => {
      qc.invalidateQueries({ queryKey: ['requestors'] })
      setValue('requestor_id', newRequestor.id)
      setQuickRequestorOpen(false)
      resetRequestor({ preferred_notification_method: 'email' })
    },
  })

  const quickFacilityMutation = useMutation({
    mutationFn: async (data: QuickFacilityForm) =>
      (await facilitiesApi.create({ ...data, status: 'active' })).data as Facility,
    onSuccess: (newFacility) => {
      qc.invalidateQueries({ queryKey: ['facilities'] })
      if (quickFacilityFor === 'intake') {
        setValue('facility_id', newFacility.id)
      } else {
        setRequestorFacilityId(newFacility.id)
      }
      setQuickFacilityOpen(false)
      resetFacility({})
    },
  })

  // ── Forms ──────────────────────────────────────────────────────────────────

  const {
    register, handleSubmit, control, watch, setValue,
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

  const { register: regClient, handleSubmit: handleClient, reset: resetClient,
    formState: { errors: clientErrors, isSubmitting: clientSubmitting } } =
    useForm<QuickClientForm>({ resolver: zodResolver(quickClientSchema) })

  const { register: regRequestor, handleSubmit: handleRequestor, reset: resetRequestor,
    formState: { errors: requestorErrors, isSubmitting: requestorSubmitting } } =
    useForm<QuickRequestorForm>({
      resolver: zodResolver(quickRequestorSchema),
      defaultValues: { preferred_notification_method: 'email' },
    })

  const { register: regFacility, handleSubmit: handleFacility, reset: resetFacility,
    formState: { errors: facilityErrors, isSubmitting: facilitySubmitting } } =
    useForm<QuickFacilityForm>({ resolver: zodResolver(quickFacilitySchema) })

  // Local state for quick-add requestor facility
  const [requestorFacilityId, setRequestorFacilityId] = useState('')

  // ── Watched values ─────────────────────────────────────────────────────────

  const facilityId = watch('facility_id') ?? ''
  const tripType = watch('trip_type')
  const clientId = watch('client_id') ?? ''

  // Auto-fill pickup address from selected facility
  useEffect(() => {
    const facility = facilities.find((f) => f.id === facilityId)
    if (facility?.address) {
      setValue('pickup_address' as keyof FormData, facility.address as never)
    }
    if (facility?.default_pay_source_id) {
      setValue('pay_source_id', facility.default_pay_source_id)
    }
  }, [facilityId, facilities, setValue])

  // Auto-fill callback phone + reply email from selected requestor
  const requestorId = watch('requestor_id') ?? ''
  useEffect(() => {
    const requestor = allRequestors.find((r) => r.id === requestorId)
    if (requestor) {
      if (requestor.phone) setValue('callback_phone', requestor.phone)
      if (requestor.email) setValue('reply_email', requestor.email)
    }
  }, [requestorId, allRequestors, setValue])

  // Auto-fill DOB from selected client (displayed read-only)
  const selectedClient = clients.find((c) => c.id === clientId)

  // Filter requestors by selected facility
  // N/A facility ('') → show requestors with no facility
  // facility selected → show requestors for that facility
  const filteredRequestors = facilityId
    ? allRequestors.filter((r) => r.facility_id === facilityId)
    : allRequestors.filter((r) => !r.facility_id)

  // Combobox options
  const facilityOptions = [
    { value: 'na', label: 'N/A — No Facility', sublabel: 'Walk-in / direct caller' },
    ...facilities.map((f) => ({ value: f.id, label: f.name, sublabel: f.address })),
  ]

  const requestorOptions = filteredRequestors.map((r) => ({
    value: r.id,
    label: r.name,
    sublabel: r.title_department,
  }))

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.full_name,
    sublabel: c.date_of_birth ? `DOB: ${c.date_of_birth}` : undefined,
  }))

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    try {
      const payload = {
        ...data,
        facility_id: data.facility_id === 'na' || !data.facility_id ? undefined : data.facility_id,
        pay_source_id: data.pay_source_id || undefined,
        reply_email: data.reply_email || undefined,
        trip_legs: additionalLegs.length ? additionalLegs : undefined,
      }
      const res = await createTrip.mutateAsync(payload)
      navigate(`/trips/${(res.data as { id: string }).id}`)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create trip')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">New Trip Request</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Intake Information ─────────────────────────────────────────── */}
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
                    {(['phone', 'email', 'fax', 'portal', 'internal'] as const).map((v) => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <FormField label="Facility" error={errors.facility_id?.message}>
              <div className="flex gap-1.5">
                <Controller name="facility_id" control={control} render={({ field }) => (
                  <Combobox
                    className="flex-1"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={facilityOptions}
                    placeholder="Search facility…"
                  />
                )} />
                <Button type="button" variant="outline" size="icon" title="Add facility"
                  onClick={() => { setQuickFacilityFor('intake'); resetFacility({}); setQuickFacilityOpen(true) }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Auto-filled pickup address hint */}
              {facilityId && facilityId !== 'na' && (() => {
                const f = facilities.find(x => x.id === facilityId)
                return f?.address ? (
                  <p className="text-xs text-gray-500 mt-1">Pick-up: {f.address}</p>
                ) : null
              })()}
            </FormField>

            <FormField label="Requestor" required error={errors.requestor_id?.message}>
              <div className="flex gap-1.5">
                <Controller name="requestor_id" control={control} render={({ field }) => (
                  <Combobox
                    className="flex-1"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={requestorOptions}
                    placeholder="Search requestor…"
                    emptyText={facilityId ? 'No requestors for this facility' : 'Select a facility first'}
                  />
                )} />
                <Button type="button" variant="outline" size="icon" title="Quick-add requestor"
                  onClick={() => {
                    setRequestorFacilityId(facilityId !== 'na' ? facilityId : '')
                    resetRequestor({ preferred_notification_method: 'email' })
                    setQuickRequestorOpen(true)
                  }}>
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

        {/* ── Client ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Client</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <FormField label="Client" required error={errors.client_id?.message}>
              <div className="flex gap-1.5">
                <Controller name="client_id" control={control} render={({ field }) => (
                  <Combobox
                    className="flex-1"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={clientOptions}
                    placeholder="Search client…"
                  />
                )} />
                <Button type="button" variant="outline" size="icon" title="Quick-add client"
                  onClick={() => { resetClient({}); setQuickClientOpen(true) }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormField>

            {/* DOB — read-only from client profile */}
            <FormField label="Date of Birth">
              <Input
                readOnly
                value={selectedClient?.date_of_birth ?? ''}
                placeholder="Auto-filled from client"
                className="bg-gray-50 text-gray-600"
              />
            </FormField>

            <FormField label="Mobility Level" error={errors.mobility_level?.message}>
              <Controller name="mobility_level" control={control} render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {(['ambulatory', 'wheelchair', 'stretcher', 'other'] as const).map((v) => (
                      <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
            </FormField>

            <div className="lg:col-span-3">
              <FormField label="Special Notes" error={errors.special_notes?.message}>
                <Textarea {...register('special_notes')} rows={2} placeholder="Mobility aids, access notes…" />
              </FormField>
            </div>

          </CardContent>
        </Card>

        {/* ── Trip Details ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Leg 1 */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leg 1</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                <FormField label="Pick-up Date" required error={errors.trip_date?.message}>
                  <Input type="date" {...register('trip_date')} />
                </FormField>

                <FormField label="Pick-up Time" error={errors.requested_pickup_time?.message}>
                  <Input type="time" {...register('requested_pickup_time')} />
                </FormField>

                <FormField label="Drop-off Location Name" error={errors.dropoff_location_name?.message}>
                  <Input {...register('dropoff_location_name')} placeholder="e.g. Mass General Hospital" />
                </FormField>

                <FormField label="Drop-off Address" error={errors.dropoff_address?.message}>
                  <Input {...register('dropoff_address')} placeholder="456 Medical Center Dr" />
                </FormField>

                <FormField label="Appointment Time" error={errors.appointment_time?.message}>
                  <Input type="time" {...register('appointment_time')} />
                </FormField>

                <FormField label="Appointment Type" error={errors.appointment_type?.message}>
                  <Input {...register('appointment_type')} placeholder="e.g. Dialysis, Oncology" />
                </FormField>

                <div className="lg:col-span-3">
                  <FormField label="Drop-off Notes (floor, suite, dept)" error={errors.dropoff_notes?.message}>
                    <Input {...register('dropoff_notes')} placeholder="e.g. 3rd floor, Suite 310" />
                  </FormField>
                </div>

              </div>
            </div>

            {/* Trip Type + conditional legs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField label="Trip Type" required error={errors.trip_type?.message}>
                <Controller name="trip_type" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v)
                    if (v !== 'multi_trip') setAdditionalLegs([])
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_way">One Way</SelectItem>
                      <SelectItem value="round_trip">Round Trip</SelectItem>
                      <SelectItem value="multi_trip">Multi-Trip</SelectItem>
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

              <div className="flex items-center gap-4 mt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('escort_needed')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
                  <span className="text-sm">Escort Needed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('will_call')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
                  <span className="text-sm">Will Call</span>
                </label>
              </div>
            </div>

            {/* Round Trip — return time */}
            {tripType === 'round_trip' && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Leg 2 — Return to Pick-up Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Return Pickup Time" error={errors.return_time?.message}>
                    <Input type="time" {...register('return_time')} />
                  </FormField>
                </div>
              </div>
            )}

            {/* Multi-Trip — additional legs */}
            {tripType === 'multi_trip' && (
              <div className="space-y-4">
                {additionalLegs.map((leg, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Leg {i + 2}
                      </p>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => setAdditionalLegs((prev) => prev.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(
                        [
                          ['dropoff_location_name', 'Drop-off Location Name', 'text', 'e.g. Mass General Hospital'],
                          ['dropoff_address', 'Drop-off Address', 'text', '456 Medical Center Dr'],
                          ['appointment_time', 'Appointment Time', 'time', ''],
                          ['appointment_type', 'Appointment Type', 'text', 'e.g. Dialysis'],
                          ['dropoff_notes', 'Drop-off Notes', 'text', 'Floor/suite/dept'],
                        ] as [keyof TripLeg, string, string, string][]
                      ).map(([key, label, type, placeholder]) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-xs">{label}</Label>
                          <Input
                            type={type}
                            placeholder={placeholder}
                            value={leg[key]}
                            onChange={(e) =>
                              setAdditionalLegs((prev) =>
                                prev.map((l, j) => j === i ? { ...l, [key]: e.target.value } : l)
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setAdditionalLegs((prev) => [...prev, newLeg()])}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Trip Leg
                </Button>
              </div>
            )}

          </CardContent>
        </Card>

        {/* ── Billing ────────────────────────────────────────────────────────── */}
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
              <Input type="number" step="0.01" min="0"
                {...register('expected_revenue', { valueAsNumber: true })}
                placeholder="0.00" />
            </FormField>

            <FormField label="Trip Order ID" error={errors.trip_order_id?.message}>
              <Input {...register('trip_order_id')} placeholder="External order reference" />
            </FormField>

            <div className="lg:col-span-2">
              <FormField label="Billing Notes" error={errors.billing_notes?.message}>
                <Textarea {...register('billing_notes')} rows={2} placeholder="Auth codes, billing instructions…" />
              </FormField>
            </div>

          </CardContent>
        </Card>

        {/* ── Internal Notes ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <FormField label="Dispatch Notes" error={errors.intake_notes?.message}>
              <Textarea {...register('intake_notes')} rows={3} placeholder="Notes for dispatcher…" />
            </FormField>

            <FormField label="Internal Warning" error={errors.internal_warning?.message}>
              <Textarea {...register('internal_warning')} rows={3} placeholder="Flags or warnings for dispatcher…" />
            </FormField>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="missing_info" {...register('missing_info_flag')}
                className="h-4 w-4 rounded border-gray-300 accent-amber-500" />
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
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>

      {/* ── Quick-Add Client ──────────────────────────────────────────────── */}
      <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Quick-Add Client</DialogTitle></DialogHeader>
          <form onSubmit={handleClient(async (data) => quickClientMutation.mutateAsync(data))} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input {...regClient('first_name')} autoFocus />
                {clientErrors.first_name && <p className="text-xs text-red-500">{clientErrors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input {...regClient('last_name')} />
                {clientErrors.last_name && <p className="text-xs text-red-500">{clientErrors.last_name.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input type="date" {...regClient('date_of_birth')} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobility Level</Label>
              <Select onValueChange={(v) => regClient('mobility_level').onChange({ target: { value: v } })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {(['ambulatory', 'wheelchair', 'stretcher', 'other'] as const).map((v) => (
                    <SelectItem key={v} value={v} className="capitalize">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {quickClientMutation.isError && <p className="text-xs text-red-500">Failed to create client</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickClientOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={clientSubmitting}>{clientSubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick-Add Requestor ───────────────────────────────────────────── */}
      <Dialog open={quickRequestorOpen} onOpenChange={setQuickRequestorOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Quick-Add Requestor</DialogTitle></DialogHeader>
          <form onSubmit={handleRequestor(async (data) =>
            quickRequestorMutation.mutateAsync({
              ...data,
              facility_id: requestorFacilityId || undefined,
            } as QuickRequestorForm)
          )} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...regRequestor('name')} autoFocus />
              {requestorErrors.name && <p className="text-xs text-red-500">{requestorErrors.name.message}</p>}
            </div>
            {/* Facility for the requestor */}
            <div className="space-y-1.5">
              <Label>Facility</Label>
              <div className="flex gap-1.5">
                <Combobox
                  className="flex-1"
                  value={requestorFacilityId}
                  onChange={setRequestorFacilityId}
                  options={facilityOptions.filter(o => o.value !== 'na')}
                  placeholder="Link to facility (optional)"
                />
                <Button type="button" variant="outline" size="icon" title="Add facility"
                  onClick={() => { setQuickFacilityFor('requestor'); resetFacility({}); setQuickFacilityOpen(true) }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
            {quickRequestorMutation.isError && <p className="text-xs text-red-500">Failed to create requestor</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickRequestorOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={requestorSubmitting}>{requestorSubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick-Add Facility ────────────────────────────────────────────── */}
      <Dialog open={quickFacilityOpen} onOpenChange={setQuickFacilityOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Facility</DialogTitle></DialogHeader>
          <form onSubmit={handleFacility(async (data) => quickFacilityMutation.mutateAsync(data))} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...regFacility('name')} autoFocus />
              {facilityErrors.name && <p className="text-xs text-red-500">{facilityErrors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input {...regFacility('address')} placeholder="123 Main St, City, ST" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...regFacility('phone')} />
            </div>
            {quickFacilityMutation.isError && <p className="text-xs text-red-500">Failed to create facility</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setQuickFacilityOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={facilitySubmitting}>{facilitySubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
