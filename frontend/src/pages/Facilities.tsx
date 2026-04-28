import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { facilitiesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/auth'
import type { Facility } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Pencil, Trash2, Building2, MapPin, Phone, Mail,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Search, StickyNote,
} from 'lucide-react'

const FACILITY_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  hospital:    { label: 'Hospital',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  clinic:      { label: 'Clinic',      color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  SNF:         { label: 'SNF',         color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
  home_health: { label: 'Home Health', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200' },
  other:       { label: 'Other',       color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
}

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  facility_type: z.enum(['hospital', 'clinic', 'SNF', 'home_health', 'other']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  internal_notes: z.string().optional(),
  account_notes: z.string().optional(),
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

export function Facilities() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<Facility | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null)
  const [apiError, setApiError]         = useState<string | null>(null)
  const [search, setSearch]             = useState('')

  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list({ status: 'all' })).data,
  })

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb.channel('facilities-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'facilities' }, () => {
        qc.invalidateQueries({ queryKey: ['facilities'] })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [qc])

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => (await facilitiesApi.create(data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => (await facilitiesApi.update(id, data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => facilitiesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['facilities'] }); setDeleteTarget(null) },
    onError: (err: unknown) => {
      const detail = (err as any)?.response?.data?.detail
      setApiError(detail ?? (err instanceof Error ? err.message : 'Error deleting'))
    },
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  function openCreate() {
    setEditing(null)
    reset({ status: 'active' })
    setApiError(null)
    setDialogOpen(true)
  }

  function openEdit(f: Facility) {
    setEditing(f)
    reset({
      name: f.name,
      facility_type: f.facility_type,
      address: f.address,
      phone: f.phone,
      email: f.email ?? '',
      status: f.status,
      internal_notes: f.internal_notes,
      account_notes: f.account_notes,
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

  const isAdmin = user?.role === 'admin'

  const filtered = facilities.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) ||
    (f.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (f.facility_type ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeCount   = facilities.filter((f) => f.status === 'active').length
  const inactiveCount = facilities.filter((f) => f.status === 'inactive').length

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Facilities</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {facilities.length} total &middot; <span className="text-green-600 font-semibold">{activeCount} active</span>
                {inactiveCount > 0 && <> &middot; <span className="text-gray-400">{inactiveCount} inactive</span></>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search facilities…"
                className="h-8 pl-8 pr-3 text-xs w-52 bg-gray-50"
              />
            </div>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Facility
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
              <p className="text-xs text-gray-400 font-medium">Loading facilities…</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_2.5fr_1.2fr_0.8fr_auto] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
              {['Name', 'Type', 'Address', 'Phone', 'Status', ''].map((h, i) => (
                <div key={i} className={`text-[10px] font-bold text-gray-400 uppercase tracking-widest ${i === 5 ? 'text-right' : ''}`}>{h}</div>
              ))}
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {search ? 'No facilities match your search' : 'No facilities yet'}
                </p>
                {!search && isAdmin && (
                  <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5 mt-1">
                    <Plus className="h-3.5 w-3.5" /> Add First Facility
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((f) => {
                  const typeConf = FACILITY_TYPE_LABELS[f.facility_type ?? '']
                  return (
                    <div
                      key={f.id}
                      className="grid grid-cols-[2fr_1fr_2.5fr_1.2fr_0.8fr_auto] gap-0 items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* Name */}
                      <div className="min-w-0 pr-4">
                        <p className="text-sm font-semibold text-gray-900 truncate">{f.name}</p>
                        {f.email && (
                          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />{f.email}
                          </p>
                        )}
                      </div>

                      {/* Type */}
                      <div>
                        {typeConf ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${typeConf.bg} ${typeConf.color}`}>
                            {typeConf.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>

                      {/* Address */}
                      <div className="pr-4 min-w-0">
                        {f.address ? (
                          <p className="text-xs text-gray-500 flex items-start gap-1.5 truncate">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-400" />
                            <span className="truncate">{f.address}</span>
                          </p>
                        ) : (
                          <span className="text-xs text-gray-300">No address</span>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        {f.phone ? (
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-gray-400 shrink-0" />{f.phone}
                          </p>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {f.status === 'active' ? (
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
                      {isAdmin ? (
                        <div className="flex items-center gap-0.5 justify-end pl-4">
                          <button
                            onClick={() => openEdit(f)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(f)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : <div />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer count */}
            {filtered.length > 0 && (
              <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
                <p className="text-[11px] text-gray-400">
                  Showing {filtered.length} of {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'}
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
                <Building2 className="h-4.5 w-4.5 text-brand-600" style={{ height: 18, width: 18 }} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 tracking-tight">
                  {editing ? 'Edit Facility' : 'Add New Facility'}
                </DialogTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {editing ? `Updating record for ${editing.name}` : 'Fill in the details to create a new facility record'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="p-6 space-y-5">

              {/* Name */}
              <Field label="Facility Name" error={errors.name?.message} required>
                <Input {...register('name')} placeholder="e.g. St. Mary's Medical Center" className="h-10" />
              </Field>

              {/* Type + Status */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Facility Type">
                  <Controller name="facility_type" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select type…" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FACILITY_TYPE_LABELS).map(([v, conf]) => (
                          <SelectItem key={v} value={v}>{conf.label}</SelectItem>
                        ))}
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

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone" error={undefined}>
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

              {/* Address */}
              <Field label="Address">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input {...register('address')} placeholder="456 Medical Center Dr, Springfield, ST 00001" className="h-10 pl-9" />
                </div>
              </Field>

              {/* Notes */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Internal Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Textarea {...register('internal_notes')} rows={3} placeholder="Staff-only notes…" className="resize-none pl-9 text-sm" />
                  </div>
                </Field>
                <Field label="Account Notes">
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Textarea {...register('account_notes')} rows={3} placeholder="Billing / account info…" className="resize-none pl-9 text-sm" />
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
                  : editing ? 'Save Changes' : 'Create Facility'
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
                    <p className="text-sm font-bold text-gray-900">Cannot Delete Facility</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{deleteTarget?.name}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 space-y-1">
                  <p>{apiError}</p>
                  <p className="text-xs text-amber-600 mt-1">Reassign or remove all linked requestors and trips first.</p>
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
                    <p className="text-sm font-bold text-gray-900">Delete Facility</p>
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
                  {deleteMutation.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</> : <><Trash2 className="h-3.5 w-3.5" /> Delete</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
