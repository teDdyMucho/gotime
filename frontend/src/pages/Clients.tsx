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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Search, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

export function Clients() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [apiError, setApiError] = useState<string | null>(null)

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
    queryKey: ['pay-sources'],
    queryFn: async () => (await paySourcesApi.list()).data,
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

  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]))

  const filtered = clients.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.full_name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search by name or phone…"
            className="pl-8 h-8 text-xs bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 text-xs shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Client
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobility</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Facility</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!filtered.length ? (
                <tr><td colSpan={6} className="text-center py-14 text-gray-400 text-sm">No clients found</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{c.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.date_of_birth ? formatDate(c.date_of_birth) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs capitalize">{c.mobility_level ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.primary_facility_id ? (facilityMap[c.primary_facility_id] ?? '—') : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name *</Label>
                  <Input {...register('first_name')} />
                  {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name *</Label>
                  <Input {...register('last_name')} />
                  {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</Label>
                  <Input type="date" {...register('date_of_birth')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</Label>
                  <Input {...register('phone')} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Address</Label>
                  <Input {...register('primary_address')} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobility Level</Label>
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
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Facility</Label>
                  <Controller name="primary_facility_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {facilities.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Default Pay Source</Label>
                  <Controller name="default_pay_source_id" control={control} render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {paySources.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Special Assistance Notes</Label>
                  <Textarea {...register('special_assistance_notes')} rows={2} className="resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recurring Notes</Label>
                  <Textarea {...register('recurring_notes')} rows={2} className="resize-none" />
                </div>
              </div>
              {apiError && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{apiError}</div>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setApiError(null) } }}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{apiError ? 'Cannot Delete Client' : 'Delete Client'}</DialogTitle>
          </DialogHeader>
          {apiError ? (
            <>
              <div className="px-6 py-5">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-1.5">
                  <p className="font-semibold">{deleteTarget?.full_name} cannot be deleted</p>
                  <p>{apiError}</p>
                  <p className="text-xs text-amber-600">Remove all linked trips first.</p>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="w-full" onClick={() => { setDeleteTarget(null); setApiError(null) }}>Got it</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This cannot be undone.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
