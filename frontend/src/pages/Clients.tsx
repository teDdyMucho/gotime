import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { clientsApi, facilitiesApi, paySourcesApi } from '@/lib/api'
import { supabase } from '@/lib/auth'
import type { Client, Facility, PaySource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Pencil, Search, Trash2, UserCircle, Phone, MapPin,
  Building2, CreditCard, AlertTriangle, Loader2, StickyNote, Calendar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

const MOBILITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ambulatory:  { label: 'Ambulatory',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  wheelchair:  { label: 'Wheelchair',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  stretcher:   { label: 'Stretcher',   color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  other:       { label: 'Other',       color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  primary_address: z.string().optional(),
  mobility_level: z.enum(['ambulatory', 'wheelchair', 'stretcher', 'other']).optional(),
  special_assistance_notes: z.string().optional(),
  default_pay_source_id: z.string().optional(),
  primary_facility_id: z.string().optional(),
  recurring_notes: z.string().optional(),
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

export function Clients() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [search, setSearch]             = useState('')
  const [apiError, setApiError]         = useState<string | null>(null)

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await clientsApi.list()).data,
  })

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb.channel('clients-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        qc.invalidateQueries({ queryKey: ['clients'] })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [qc])

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list()).data,
  })

  const { data: paySources = [] } = useQuery<PaySource[]>({
    queryKey: ['pay-sources', 'active'],
    queryFn: async () => (await paySourcesApi.list({ status: 'active' })).data,
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => (await clientsApi.create(data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => (await clientsApi.update(id, data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => clientsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setDeleteTarget(null) },
    onError: (err: unknown) => {
      const detail = (err as any)?.response?.data?.detail
      setApiError(detail ?? (err instanceof Error ? err.message : 'Error deleting'))
    },
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  function openCreate() {
    setEditing(null)
    reset({})
    setApiError(null)
    setDialogOpen(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    reset({
      first_name: c.first_name ?? c.full_name.split(' ')[0],
      last_name: c.last_name ?? c.full_name.split(' ').slice(1).join(' '),
      date_of_birth: c.date_of_birth ?? undefined,
      phone: c.phone ?? undefined,
      primary_address: c.primary_address ?? undefined,
      mobility_level: c.mobility_level ?? undefined,
      special_assistance_notes: c.special_assistance_notes ?? undefined,
      default_pay_source_id: c.default_pay_source_id ?? undefined,
      primary_facility_id: c.primary_facility_id ?? undefined,
      recurring_notes: c.recurring_notes ?? undefined,
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
    const payload = {
      ...data,
      full_name: `${data.first_name} ${data.last_name}`.trim(),
      default_pay_source_id: data.default_pay_source_id || undefined,
      primary_facility_id: data.primary_facility_id || undefined,
    }
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
  }

  const facilityMap   = Object.fromEntries(facilities.map((f) => [f.id, f.name]))
  const paySourceMap  = Object.fromEntries(paySources.map((p) => [p.id, p.name]))

  const filtered = clients.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
  })

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <UserCircle className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Clients</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {clients.length} total client{clients.length !== 1 ? 's' : ''} registered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone…"
                className="h-8 pl-8 pr-3 text-xs w-52 bg-gray-50"
              />
            </div>
            <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Client
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-brand-600" />
              <p className="text-xs text-gray-400 font-medium">Loading clients…</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1.5fr_auto] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
              {['Name', 'DOB', 'Phone', 'Mobility', 'Facility', ''].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}>{h}</div>
              ))}
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <UserCircle className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {search ? 'No clients match your search' : 'No clients yet'}
                </p>
                {!search && (
                  <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5 mt-1">
                    <Plus className="h-3.5 w-3.5" /> Add First Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((c) => {
                  const mobility = c.mobility_level ? MOBILITY_CONFIG[c.mobility_level] : null
                  const facilityName = c.primary_facility_id ? facilityMap[c.primary_facility_id] : null
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1.5fr_auto] gap-0 items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Name */}
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.full_name}</p>
                        {c.primary_address && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />{c.primary_address}
                          </p>
                        )}
                      </div>

                      {/* DOB */}
                      <div>
                        {c.date_of_birth ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-gray-400 shrink-0" />
                            {formatDate(c.date_of_birth)}
                          </p>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Phone */}
                      <div>
                        {c.phone ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />{c.phone}
                          </p>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Mobility */}
                      <div>
                        {mobility ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${mobility.bg} ${mobility.color} ${mobility.border}`}>
                            {mobility.label}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Facility */}
                      <div className="min-w-0 pr-4">
                        {facilityName ? (
                          <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                            <Building2 className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="truncate">{facilityName}</span>
                          </p>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 justify-end pl-4">
                        <button
                          onClick={() => openEdit(c)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(c); setApiError(null) }}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
                <p className="text-[11px] text-gray-400">
                  Showing {filtered.length} of {clients.length} clients
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

          <div className="bg-white border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-[18px] w-[18px] text-brand-600" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 tracking-tight">
                  {editing ? 'Edit Client' : 'Add New Client'}
                </DialogTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {editing ? `Updating record for ${editing.full_name}` : 'Fill in the details to register a new client'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-4">

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" error={errors.first_name?.message} required>
                  <Input {...register('first_name')} placeholder="e.g. John" className="h-10" />
                </Field>
                <Field label="Last Name" error={errors.last_name?.message} required>
                  <Input {...register('last_name')} placeholder="e.g. Doe" className="h-10" />
                </Field>
              </div>

              {/* DOB + Phone */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Birth">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input type="date" {...register('date_of_birth')} className="h-10 pl-9" />
                  </div>
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input {...register('phone')} placeholder="(555) 000-0000" className="h-10 pl-9" />
                  </div>
                </Field>
              </div>

              {/* Address */}
              <Field label="Primary Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input {...register('primary_address')} placeholder="123 Main St, Springfield, ST 00001" className="h-10 pl-9" />
                </div>
              </Field>

              {/* Mobility + Facility */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Mobility Level">
                  <Controller name="mobility_level" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(MOBILITY_CONFIG).map(([v, c]) => (
                          <SelectItem key={v} value={v}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
                <Field label="Primary Facility">
                  <Controller name="primary_facility_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </Field>
              </div>

              {/* Default Pay Source */}
              <Field label="Default Pay Source">
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Controller name="default_pay_source_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 pl-9"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {paySources.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
              </Field>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Special Assistance Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Textarea {...register('special_assistance_notes')} rows={2} placeholder="Mobility aids, access notes…" className="resize-none pl-9 text-sm" />
                  </div>
                </Field>
                <Field label="Recurring Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Textarea {...register('recurring_notes')} rows={2} placeholder="Recurring appointment info…" className="resize-none pl-9 text-sm" />
                  </div>
                </Field>
              </div>

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
                  : editing ? 'Save Changes' : 'Create Client'
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
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
                    <p className="text-sm font-bold text-gray-900">Cannot Delete Client</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{deleteTarget?.full_name}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <p>{apiError}</p>
                  <p className="text-xs text-amber-600 mt-1">Remove all linked trips first.</p>
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
                    <p className="text-sm font-bold text-gray-900">Delete Client</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete <strong className="text-gray-900">{deleteTarget?.full_name}</strong>?
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
