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
  full_name: z.string().min(1, 'Full name is required'),
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
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error deleting'),
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
      full_name: c.full_name,
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or phone…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">DOB</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mobility</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Facility</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No clients found</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.date_of_birth ? formatDate(c.date_of_birth) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{c.mobility_level ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.primary_facility_id ? (facilityMap[c.primary_facility_id] ?? '—') : '—'}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(c)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input {...register('full_name')} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" {...register('date_of_birth')} />
              </div>

              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Primary Address</Label>
                <Input {...register('primary_address')} />
              </div>

              <div className="space-y-1.5">
                <Label>Mobility Level</Label>
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
                <Label>Primary Facility</Label>
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
                <Label>Default Pay Source</Label>
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
                <Label>Special Assistance Notes</Label>
                <Textarea {...register('special_assistance_notes')} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Recurring Notes</Label>
                <Textarea {...register('recurring_notes')} rows={2} />
              </div>
            </div>

            {apiError && <p className="text-sm text-red-500">{apiError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Delete Client</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.full_name}</strong>? This cannot be undone.</p>
          {apiError && <p className="text-sm text-red-500">{apiError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
