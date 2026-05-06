import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { requestorsApi, facilitiesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/auth'
import type { Requestor, Facility } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Pencil, Trash2, Users, Phone, Mail, Building2,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Search,
  MessageSquare, Inbox, StickyNote,
} from 'lucide-react'
import { SmsConsentCheckbox } from '@/components/ui/SmsConsentCheckbox'

const NOTIFY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  email: { label: 'Email',    color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  sms:   { label: 'SMS',     color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  both:  { label: 'Email + SMS', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  title_department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  preferred_notification_method: z.enum(['sms', 'email', 'both']),
  sms_consent: z.boolean().optional(),
  facility_id: z.string().uuid('Select a facility'),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  const needsSms = data.preferred_notification_method === 'sms' || data.preferred_notification_method === 'both'
  if (needsSms && !data.sms_consent) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sms_consent'], message: 'SMS consent is required when SMS notifications are enabled.' })
  }
})

type FormData = z.infer<typeof schema>

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-red-400 inline-block" />{error}</p>}
    </div>
  )
}

export function Requestors() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<Requestor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Requestor | null>(null)
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [apiError, setApiError]         = useState<string | null>(null)
  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState<'no_trips' | 'has_trips'>('no_trips')

  const { data: requestors = [], isLoading } = useQuery<Requestor[]>({
    queryKey: ['requestors'],
    queryFn: async () => (await requestorsApi.list({ status: 'all' })).data,
  })

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb.channel('requestors-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requestors' }, () => {
        qc.invalidateQueries({ queryKey: ['requestors'] })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [qc])

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list()).data,
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => (await requestorsApi.create(data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requestors'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => (await requestorsApi.update(id, data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requestors'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => requestorsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requestors'] }); setDeleteTarget(null) },
    onError: (err: unknown) => {
      const detail = (err as any)?.response?.data?.detail
      setApiError(detail ?? (err instanceof Error ? err.message : 'Error deleting'))
    },
  })

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { preferred_notification_method: 'email', status: 'active', sms_consent: false },
  })

  const notifyMethod = watch('preferred_notification_method')
  const smsConsent   = watch('sms_consent')
  const needsSms     = notifyMethod === 'sms' || notifyMethod === 'both'

  function openCreate() {
    setEditing(null)
    reset({ preferred_notification_method: 'email', status: 'active', sms_consent: false })
    setApiError(null)
    setDialogOpen(true)
  }

  function openEdit(r: Requestor) {
    setEditing(r)
    const hasSms = r.preferred_notification_method === 'sms' || r.preferred_notification_method === 'both'
    reset({
      name: r.name,
      title_department: r.title_department ?? undefined,
      phone: r.phone ?? undefined,
      email: r.email ?? '',
      preferred_notification_method: r.preferred_notification_method,
      sms_consent: hasSms,
      facility_id: r.facility_id,
      status: r.status,
      notes: r.notes ?? undefined,
    })
    setApiError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  async function onSubmit(data: FormData) {
    setApiError(null)
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]))
  const canEdit = user?.role === 'senior_dispatcher' || user?.role === 'admin'

  const byFacility = facilityFilter === 'all'
    ? requestors
    : requestors.filter((r) => r.facility_id === facilityFilter)

  const byTab = byFacility.filter((r) =>
    activeTab === 'no_trips' ? !r.has_trips : r.has_trips
  )

  const filtered = byTab.filter((r) =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.title_department ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.phone ?? '').includes(search) ||
    (r.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const noTripsCount  = byFacility.filter((r) => !r.has_trips).length
  const hasTripsCount = byFacility.filter((r) => r.has_trips).length
  const activeCount   = requestors.filter((r) => r.status === 'active').length

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Requestors</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {requestors.length} total &middot; <span className="text-green-600 font-semibold">{activeCount} active</span>
                &middot; {hasTripsCount} with trips
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Facility filter */}
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="h-8 text-xs w-48">
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Facilities</SelectItem>
                {facilities.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requestors…"
                className="h-8 pl-8 pr-3 text-xs w-52 bg-gray-50"
              />
            </div>
            {canEdit && (
              <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Requestor
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-brand-600" />
              <p className="text-xs text-gray-400 font-medium">Loading requestors…</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Tabs */}
            <div className="flex items-center border-b border-gray-100 px-5 gap-1 pt-1">
              {([
                { key: 'no_trips',  label: 'No Trips',  count: noTripsCount,  icon: Inbox },
                { key: 'has_trips', label: 'Has Trips', count: hasTripsCount, icon: MessageSquare },
              ] as const).map(({ key, label, count, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                    activeTab === key
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === key ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              ))}
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1.2fr_1fr_0.8fr_auto] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
              {['Name', 'Facility', 'Phone', 'Notify Via', 'Status', ''].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}>{h}</div>
              ))}
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {search ? 'No requestors match your search' : `No requestors ${activeTab === 'no_trips' ? 'without trips' : 'with trips'}`}
                </p>
                {!search && canEdit && activeTab === 'no_trips' && (
                  <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5 mt-1">
                    <Plus className="h-3.5 w-3.5" /> Add First Requestor
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((r) => {
                  const notify = NOTIFY_CONFIG[r.preferred_notification_method]
                  const facilityName = r.facility_id ? facilityMap[r.facility_id] : undefined
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-[2fr_1.5fr_1.2fr_1fr_0.8fr_auto] gap-0 items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* Name */}
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                        {r.title_department && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{r.title_department}</p>
                        )}
                        {r.email && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />{r.email}
                          </p>
                        )}
                      </div>

                      {/* Facility */}
                      <div className="pr-4 min-w-0">
                        {facilityName ? (
                          <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                            <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{facilityName}</span>
                          </p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        {r.phone ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />{r.phone}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>

                      {/* Notify */}
                      <div>
                        {notify && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${notify.bg} ${notify.color} ${notify.border}`}>
                            {notify.label}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {r.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-[11px] font-semibold text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-semibold text-gray-500">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {canEdit ? (
                        <div className="flex items-center gap-0.5 justify-end pl-4">
                          <button
                            onClick={() => openEdit(r)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {activeTab === 'no_trips' && (
                            <button
                              onClick={() => { setDeleteTarget(r); setApiError(null) }}
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ) : <div />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
                <p className="text-[11px] text-gray-400">
                  Showing {filtered.length} of {byTab.length} requestors
                  {search && ` matching "${search}"`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden" aria-describedby={undefined}>

          {/* Modal header */}
          <div className="bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                <Users className="h-4.5 w-4.5 text-brand-600" style={{ height: 18, width: 18 }} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 tracking-tight">
                  {editing ? 'Edit Requestor' : 'Add New Requestor'}
                </DialogTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {editing ? `Updating record for ${editing.name}` : 'Fill in the details to create a new requestor contact'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-4">

              {/* Name */}
              <Field label="Full Name" error={errors.name?.message} required>
                <Input {...register('name')} placeholder="e.g. Jane Smith" className="h-10" />
              </Field>

              {/* Title + Facility */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Title / Department">
                  <Input {...register('title_department')} placeholder="e.g. Case Manager" className="h-10" />
                </Field>
                <Field label="Facility" error={errors.facility_id?.message} required>
                  <Controller name="facility_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select facility…" /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input {...register('phone')} placeholder="(555) 000-0000" className="h-10 pl-9" />
                  </div>
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input {...register('email')} type="email" placeholder="contact@facility.org" className="h-10 pl-9" />
                  </div>
                </Field>
              </div>

              {/* Notification method + Status */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Notification Method">
                  <Controller name="preferred_notification_method" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={(v) => {
                      field.onChange(v)
                      if (v === 'email') setValue('sms_consent', false)
                    }}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="both">Email + SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
                <Field label="Status">
                  <Controller name="status" control={control} render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
              </div>

              {/* SMS consent — shown only when SMS is selected */}
              {needsSms && (
                <SmsConsentCheckbox
                  checked={!!smsConsent}
                  onChange={(v) => setValue('sms_consent', v, { shouldValidate: true })}
                  error={errors.sms_consent?.message}
                />
              )}

              {/* Notes */}
              <Field label="Notes">
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Textarea {...register('notes')} rows={2} placeholder="Additional notes…" className="resize-none pl-9 text-sm" />
                </div>
              </Field>

              {apiError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {apiError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 px-4" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" size="sm" className="h-9 px-5 gap-1.5" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                  : editing ? 'Save Changes' : 'Create Requestor'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setApiError(null) } }}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" aria-describedby={undefined}>
          {apiError ? (
            <>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Cannot Delete Requestor</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{deleteTarget?.name}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
                  <p>{apiError}</p>
                  <p className="text-xs text-amber-600 mt-1">Reassign or remove all linked trips first.</p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60">
                <Button size="sm" className="w-full h-9" onClick={() => { setDeleteTarget(null); setApiError(null) }}>Got it</Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Delete Requestor</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <strong className="text-gray-900">{deleteTarget?.name}</strong>?
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" className="h-9 px-4" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button
                  variant="destructive" size="sm" className="h-9 px-4 gap-1.5"
                  onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
                    : <><Trash2 className="h-3.5 w-3.5" /> Delete</>
                  }
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
