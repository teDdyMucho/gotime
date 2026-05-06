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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, User, Car, CreditCard, FileText, Send, AlertTriangle } from 'lucide-react'
import { SmsConsentCheckbox } from '@/components/ui/SmsConsentCheckbox'
import { formatDate } from '@/lib/utils'
//fdasfa
const schema = z.object({
  intake_channel: z.enum(['phone', 'email', 'fax', 'portal', 'internal']),
  requestor_id: z.string().uuid('Select a requestor'),
  facility_id: z.string().uuid().optional().or(z.literal('')),
  callback_phone: z.string().optional(),
  reply_email: z.string().email().optional().or(z.literal('')),
  client_id: z.string().uuid('Select a client'),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
  special_notes: z.string().optional(),
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
  pay_source_id: z.string().uuid().optional().or(z.literal('')),
  expected_revenue: z.number().nonnegative().optional(),
  trip_order_id: z.string().optional(),
  billing_notes: z.string().optional(),
  intake_notes: z.string().optional(),
  missing_info_flag: z.boolean(),
  internal_warning: z.string().optional(),
})

type FormData = z.infer<typeof schema>

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
  sms_consent: z.boolean().optional(),
  facility_id: z.string().optional(),
}).superRefine((data, ctx) => {
  const needsSms = data.preferred_notification_method === 'sms' || data.preferred_notification_method === 'both'
  if (needsSms && !data.sms_consent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sms_consent'], message: 'SMS consent is required when SMS notifications are enabled.' })
  }
})
type QuickRequestorForm = z.infer<typeof quickRequestorSchema>

const quickFacilitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
})
type QuickFacilityForm = z.infer<typeof quickFacilitySchema>

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, iconBg, children }: {
  title: string; icon: React.ElementType; iconBg: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

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
      resetRequestor({ preferred_notification_method: 'email', sms_consent: false })
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
    watch: watchRequestor, setValue: setRequestorValue, control: controlRequestor,
    formState: { errors: requestorErrors, isSubmitting: requestorSubmitting } } =
    useForm<QuickRequestorForm>({
      resolver: zodResolver(quickRequestorSchema),
      defaultValues: { preferred_notification_method: 'email', sms_consent: false },
    })

  const quickNotifyMethod = watchRequestor('preferred_notification_method')
  const quickSmsConsent   = watchRequestor('sms_consent')
  const quickNeedsSms     = quickNotifyMethod === 'sms' || quickNotifyMethod === 'both'

  const { register: regFacility, handleSubmit: handleFacility, reset: resetFacility,
    formState: { errors: facilityErrors, isSubmitting: facilitySubmitting } } =
    useForm<QuickFacilityForm>({ resolver: zodResolver(quickFacilitySchema) })

  const [requestorFacilityId, setRequestorFacilityId] = useState('')

  const facilityId = watch('facility_id') ?? ''
  const tripType   = watch('trip_type')
  const clientId   = watch('client_id') ?? ''

  useEffect(() => {
    const facility = facilities.find((f) => f.id === facilityId)
    if (facility?.address) setValue('pickup_address' as keyof FormData, facility.address as never)
    if (facility?.default_pay_source_id) setValue('pay_source_id', facility.default_pay_source_id)
  }, [facilityId, facilities, setValue])

  const requestorId = watch('requestor_id') ?? ''
  useEffect(() => {
    const requestor = allRequestors.find((r) => r.id === requestorId)
    if (requestor) {
      if (requestor.phone) setValue('callback_phone', requestor.phone)
      if (requestor.email) setValue('reply_email', requestor.email)
    }
  }, [requestorId, allRequestors, setValue])

  const selectedClient = clients.find((c) => c.id === clientId)

  useEffect(() => {
    if (!selectedClient) return
    if (selectedClient.default_pay_source_id) {
      setValue('pay_source_id', selectedClient.default_pay_source_id)
    }
    if (selectedClient.mobility_level) {
      setValue('mobility_level', selectedClient.mobility_level)
    }
  }, [clientId, selectedClient, setValue])

  const filteredRequestors = facilityId
    ? allRequestors.filter((r) => r.facility_id === facilityId)
    : allRequestors.filter((r) => !r.facility_id)

  const facilityOptions = [
    { value: 'na', label: 'N/A — No Facility', sublabel: 'Walk-in / direct caller' },
    ...facilities.map((f) => ({ value: f.id, label: f.name, sublabel: f.address })),
  ]
  const requestorOptions = filteredRequestors.map((r) => ({
    value: r.id, label: r.name, sublabel: r.title_department,
  }))
  const clientOptions = clients.map((c) => ({
    value: c.id, label: c.full_name,
    sublabel: c.date_of_birth ? `DOB: ${formatDate(c.date_of_birth)}` : undefined,
  }))

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

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">

        {/* ── Hero header ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">New Trip Request</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Fill in all required fields and submit to create a trip</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="h-8 text-xs gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? 'Submitting…' : 'Submit Trip Request'}
            </Button>
          </div>
        </div>

        {/* ── Card container ── */}
        <div className="p-6 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* ── Intake Information ── */}
            <Section title="Intake Information" icon={FileText} iconBg="bg-blue-100 text-blue-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <Field label="Intake Channel" required error={errors.intake_channel?.message}>
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
                </Field>

                <div className="xl:col-span-2">
                  <Field label="Facility" error={errors.facility_id?.message}>
                    <div className="flex gap-1.5">
                      <Controller name="facility_id" control={control} render={({ field }) => (
                        <Combobox className="flex-1" value={field.value ?? ''} onChange={field.onChange}
                          options={facilityOptions} placeholder="Search facility…" />
                      )} />
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Add facility"
                        onClick={() => { setQuickFacilityFor('intake'); resetFacility({}); setQuickFacilityOpen(true) }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {facilityId && facilityId !== 'na' && (() => {
                      const f = facilities.find(x => x.id === facilityId)
                      return f?.address ? <p className="text-xs text-gray-400 mt-1">Pick-up: {f.address}</p> : null
                    })()}
                  </Field>
                </div>

                <div className="xl:col-span-2">
                  <Field label="Requestor" required error={errors.requestor_id?.message}>
                    <div className="flex gap-1.5">
                      <Controller name="requestor_id" control={control} render={({ field }) => (
                        <Combobox className="flex-1" value={field.value ?? ''} onChange={field.onChange}
                          options={requestorOptions} placeholder="Search requestor…"
                          emptyText={facilityId ? 'No requestors for this facility' : 'Select a facility first'} />
                      )} />
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Quick-add requestor"
                        onClick={() => {
                          setRequestorFacilityId(facilityId !== 'na' ? facilityId : '')
                          resetRequestor({ preferred_notification_method: 'email', sms_consent: false })
                          setQuickRequestorOpen(true)
                        }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                </div>

                <Field label="Callback Phone" error={errors.callback_phone?.message}>
                  <Input {...register('callback_phone')} placeholder="(555) 000-0000" />
                </Field>

                <Field label="Reply Email" error={errors.reply_email?.message}>
                  <Input {...register('reply_email')} type="email" placeholder="requestor@facility.org" />
                </Field>
              </div>
            </Section>

            {/* ── Client ── */}
            <Section title="Client" icon={User} iconBg="bg-brand-100 text-brand-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <Field label="Client" required error={errors.client_id?.message}>
                    <div className="flex gap-1.5">
                      <Controller name="client_id" control={control} render={({ field }) => (
                        <Combobox className="flex-1" value={field.value ?? ''} onChange={field.onChange}
                          options={clientOptions} placeholder="Search client…" />
                      )} />
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Quick-add client"
                        onClick={() => { resetClient({}); setQuickClientOpen(true) }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                </div>

                <Field label="Date of Birth">
                  <Input readOnly
                    value={selectedClient?.date_of_birth ? formatDate(selectedClient.date_of_birth) : ''}
                    placeholder="Auto-filled from client"
                    className="bg-gray-50 text-gray-500 cursor-default" />
                </Field>

                <Field label="Mobility Level" error={errors.mobility_level?.message}>
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
                </Field>

                <div className="lg:col-span-4">
                  <Field label="Special Notes" error={errors.special_notes?.message}>
                    <Textarea {...register('special_notes')} rows={2} placeholder="Mobility aids, access notes…" className="resize-none" />
                  </Field>
                </div>
              </div>
            </Section>

            {/* ── Trip Details ── */}
            <Section title="Trip Details" icon={Car} iconBg="bg-orange-100 text-orange-600">
              <div className="space-y-5">
                {/* Leg 1 */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Leg 1</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Field label="Pick-up Date" required error={errors.trip_date?.message}>
                      <Input type="date" {...register('trip_date')} />
                    </Field>
                    <Field label="Pick-up Time" error={errors.requested_pickup_time?.message}>
                      <Input type="time" {...register('requested_pickup_time')} />
                    </Field>
                    <Field label="Appointment Time" error={errors.appointment_time?.message}>
                      <Input type="time" {...register('appointment_time')} />
                    </Field>
                    <Field label="Appointment Type" error={errors.appointment_type?.message}>
                      <Input {...register('appointment_type')} placeholder="e.g. Dialysis" />
                    </Field>
                    <div className="xl:col-span-2">
                      <Field label="Drop-off Location Name" error={errors.dropoff_location_name?.message}>
                        <Input {...register('dropoff_location_name')} placeholder="e.g. Mass General Hospital" />
                      </Field>
                    </div>
                    <div className="xl:col-span-2">
                      <Field label="Drop-off Address" error={errors.dropoff_address?.message}>
                        <Input {...register('dropoff_address')} placeholder="456 Medical Center Dr" />
                      </Field>
                    </div>
                    <div className="xl:col-span-4">
                      <Field label="Drop-off Notes (floor, suite, dept)" error={errors.dropoff_notes?.message}>
                        <Input {...register('dropoff_notes')} placeholder="e.g. 3rd floor, Suite 310" />
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Trip options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
                  <Field label="Trip Type" required error={errors.trip_type?.message}>
                    <Controller name="trip_type" control={control} render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => { field.onChange(v); if (v !== 'multi_trip') setAdditionalLegs([]) }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_way">One Way</SelectItem>
                          <SelectItem value="round_trip">Round Trip</SelectItem>
                          <SelectItem value="multi_trip">Multi-Trip</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </Field>

                  <Field label="Urgency Level" required error={errors.urgency_level?.message}>
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
                  </Field>

                  <div className="flex items-end gap-5 pb-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register('escort_needed')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
                      <span className="text-xs font-semibold text-gray-600">Escort Needed</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" {...register('will_call')} className="h-4 w-4 rounded border-gray-300 accent-brand-600" />
                      <span className="text-xs font-semibold text-gray-600">Will Call</span>
                    </label>
                  </div>
                </div>

                {/* Round trip leg */}
                {tripType === 'round_trip' && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Leg 2 — Return to Pick-up</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="Return Pickup Time" error={errors.return_time?.message}>
                        <Input type="time" {...register('return_time')} />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Multi-trip legs */}
                {tripType === 'multi_trip' && (
                  <div className="space-y-3">
                    {additionalLegs.map((leg, i) => (
                      <div key={i} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Leg {i + 2}</p>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => setAdditionalLegs((prev) => prev.filter((_, j) => j !== i))}>
                            <Trash2 className="h-3.5 w-3.5 text-gray-400" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(
                            [
                              ['dropoff_location_name', 'Drop-off Location', 'text', 'e.g. Mass General Hospital'],
                              ['dropoff_address', 'Drop-off Address', 'text', '456 Medical Center Dr'],
                              ['appointment_time', 'Appointment Time', 'time', ''],
                              ['appointment_type', 'Appointment Type', 'text', 'e.g. Dialysis'],
                              ['dropoff_notes', 'Drop-off Notes', 'text', 'Floor/suite/dept'],
                            ] as [keyof TripLeg, string, string, string][]
                          ).map(([key, label, type, placeholder]) => (
                            <div key={key} className="space-y-1.5">
                              <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</Label>
                              <Input type={type} placeholder={placeholder} value={leg[key]}
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
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5"
                      onClick={() => setAdditionalLegs((prev) => [...prev, newLeg()])}>
                      <Plus className="h-3.5 w-3.5" />
                      Add Trip Leg
                    </Button>
                  </div>
                )}
              </div>
            </Section>

            {/* ── Billing ── */}
            <Section title="Billing" icon={CreditCard} iconBg="bg-emerald-100 text-emerald-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Pay Source" error={errors.pay_source_id?.message}>
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
                </Field>

                <Field label="Expected Revenue ($)" error={errors.expected_revenue?.message}>
                  <Input type="number" step="0.01" min="0"
                    {...register('expected_revenue', { valueAsNumber: true })} placeholder="0.00" />
                </Field>

                <Field label="Trip Order ID" error={errors.trip_order_id?.message}>
                  <Input {...register('trip_order_id')} placeholder="External order reference" />
                </Field>

                <div className="lg:col-span-4">
                  <Field label="Billing Notes" error={errors.billing_notes?.message}>
                    <Textarea {...register('billing_notes')} rows={2} placeholder="Auth codes, billing instructions…" className="resize-none" />
                  </Field>
                </div>
              </div>
            </Section>

            {/* ── Internal Notes ── */}
            <Section title="Internal Notes" icon={AlertTriangle} iconBg="bg-amber-100 text-amber-600">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Dispatch Notes" error={errors.intake_notes?.message}>
                  <Textarea {...register('intake_notes')} rows={3} placeholder="Notes for dispatcher…" className="resize-none" />
                </Field>
                <Field label="Internal Warning" error={errors.internal_warning?.message}>
                  <Textarea {...register('internal_warning')} rows={3} placeholder="Flags or warnings for dispatcher…" className="resize-none" />
                </Field>
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                    <input type="checkbox" id="missing_info" {...register('missing_info_flag')}
                      className="h-4 w-4 rounded border-gray-300 accent-amber-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Flag as Missing Info</span>
                  </label>
                </div>
              </div>
            </Section>

          </div>

          {submitError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Bottom submit bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-400">All required fields must be filled before submitting.</p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="h-9 px-5 gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? 'Submitting…' : 'Submit Trip Request'}
              </Button>
            </div>
          </div>
        </div>

      </form>

      {/* ── Quick-Add Client ── */}
      <Dialog open={quickClientOpen} onOpenChange={setQuickClientOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Quick-Add Client</DialogTitle></DialogHeader>
          <form onSubmit={handleClient(async (data) => quickClientMutation.mutateAsync(data))}>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name *</Label>
                  <Input {...regClient('first_name')} autoFocus />
                  {clientErrors.first_name && <p className="text-xs text-red-500">{clientErrors.first_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name *</Label>
                  <Input {...regClient('last_name')} />
                  {clientErrors.last_name && <p className="text-xs text-red-500">{clientErrors.last_name.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</Label>
                <Input type="date" {...regClient('date_of_birth')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobility Level</Label>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickClientOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={clientSubmitting}>{clientSubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick-Add Requestor ── */}
      <Dialog open={quickRequestorOpen} onOpenChange={setQuickRequestorOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Quick-Add Requestor</DialogTitle></DialogHeader>
          <form onSubmit={handleRequestor(async (data) =>
            quickRequestorMutation.mutateAsync({ ...data, facility_id: requestorFacilityId || undefined } as QuickRequestorForm)
          )}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</Label>
                <Input {...regRequestor('name')} autoFocus />
                {requestorErrors.name && <p className="text-xs text-red-500">{requestorErrors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Facility</Label>
                <div className="flex gap-1.5">
                  <Combobox className="flex-1" value={requestorFacilityId} onChange={setRequestorFacilityId}
                    options={facilityOptions.filter(o => o.value !== 'na')}
                    placeholder="Link to facility (optional)" />
                  <Button type="button" variant="outline" size="icon" title="Add facility"
                    onClick={() => { setQuickFacilityFor('requestor'); resetFacility({}); setQuickFacilityOpen(true) }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title / Dept</Label>
                  <Input {...regRequestor('title_department')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</Label>
                  <Input {...regRequestor('phone')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</Label>
                <Input {...regRequestor('email')} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notification Method</Label>
                <Controller name="preferred_notification_method" control={controlRequestor} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v)
                    if (v === 'email') setRequestorValue('sms_consent', false)
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Email + SMS</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              {quickNeedsSms && (
                <SmsConsentCheckbox
                  checked={!!quickSmsConsent}
                  onChange={(v) => setRequestorValue('sms_consent', v, { shouldValidate: true })}
                  error={requestorErrors.sms_consent?.message}
                />
              )}
              {quickRequestorMutation.isError && <p className="text-xs text-red-500">Failed to create requestor</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickRequestorOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={requestorSubmitting}>{requestorSubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Quick-Add Facility ── */}
      <Dialog open={quickFacilityOpen} onOpenChange={setQuickFacilityOpen}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Add Facility</DialogTitle></DialogHeader>
          <form onSubmit={handleFacility(async (data) => quickFacilityMutation.mutateAsync(data))}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</Label>
                <Input {...regFacility('name')} autoFocus />
                {facilityErrors.name && <p className="text-xs text-red-500">{facilityErrors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</Label>
                <Input {...regFacility('address')} placeholder="123 Main St, City, ST" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</Label>
                <Input {...regFacility('phone')} />
              </div>
              {quickFacilityMutation.isError && <p className="text-xs text-red-500">Failed to create facility</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickFacilityOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={facilitySubmitting}>{facilitySubmitting ? 'Creating…' : 'Create & Select'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
