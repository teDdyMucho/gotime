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
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  title_department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  preferred_notification_method: z.enum(['sms', 'email', 'both']),
  facility_id: z.string().uuid('Select a facility'),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function Requestors() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Requestor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Requestor | null>(null)
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [apiError, setApiError] = useState<string | null>(null)

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

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { preferred_notification_method: 'email', status: 'active' },
  })

  function openCreate() {
    setEditing(null)
    reset({ preferred_notification_method: 'email', status: 'active' })
    setApiError(null)
    setDialogOpen(true)
  }

  function openEdit(r: Requestor) {
    setEditing(r)
    reset({
      name: r.name,
      title_department: r.title_department ?? undefined,
      phone: r.phone ?? undefined,
      email: r.email ?? '',
      preferred_notification_method: r.preferred_notification_method,
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

  const [activeTab, setActiveTab] = useState<'no_trips' | 'has_trips'>('no_trips')

  const byFacility = facilityFilter === 'all'
    ? requestors
    : requestors.filter((r) => r.facility_id === facilityFilter)

  const filtered = byFacility.filter((r) =>
    activeTab === 'no_trips' ? !r.has_trips : r.has_trips
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Requestors</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Requestor
        </Button>
      </div>

      <Select value={facilityFilter} onValueChange={setFacilityFilter}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="All Facilities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Facilities</SelectItem>
          {facilities.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('no_trips')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'no_trips'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          No Trips
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
            {byFacility.filter((r) => !r.has_trips).length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('has_trips')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'has_trips'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Has Trips
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">
            {byFacility.filter((r) => r.has_trips).length}
          </span>
        </button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Facility</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notify Via</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {canEdit && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No requestors found</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.name}</p>
                    {r.title_department && <p className="text-xs text-gray-400">{r.title_department}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{(r.facility_id ? facilityMap[r.facility_id] : undefined) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{r.preferred_notification_method}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'active' ? 'accepted' : 'canceled'}>{r.status}</Badge>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {activeTab === 'no_trips' && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(r)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Requestor' : 'Add Requestor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Title / Department</Label>
                <Input {...register('title_department')} />
              </div>

              <div className="space-y-1.5">
                <Label>Facility *</Label>
                <Controller name="facility_id" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {facilities.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.facility_id && <p className="text-xs text-red-500">{errors.facility_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...register('email')} type="email" />
              </div>

              <div className="space-y-1.5">
                <Label>Notification Method</Label>
                <Controller name="preferred_notification_method" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea {...register('notes')} rows={2} />
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

      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setApiError(null) } }}>
        <DialogContent className="max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{apiError ? 'Cannot Delete Requestor' : 'Delete Requestor'}</DialogTitle>
          </DialogHeader>
          {apiError ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-2">
                <p className="font-semibold">⚠ {deleteTarget?.name} cannot be deleted</p>
                <p>{apiError}</p>
                <p className="text-xs text-amber-600">To delete this requestor, first reassign or remove all linked trips.</p>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={() => { setDeleteTarget(null); setApiError(null) }}>Got it</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
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
