import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { paySourcesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/auth'
import type { PaySource } from '@/lib/types'
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
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function PaySources() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PaySource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaySource | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb.channel('pay-sources-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pay_sources' }, () => {
        qc.invalidateQueries({ queryKey: ['pay-sources'] })
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [qc])

  const { data: paySources = [], isLoading } = useQuery<PaySource[]>({
    queryKey: ['pay-sources', statusFilter],
    queryFn: async () => (await paySourcesApi.list({ status: statusFilter })).data,
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => (await paySourcesApi.create(data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pay-sources'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error creating pay source'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) =>
      (await paySourcesApi.update(id, data)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pay-sources'] }); closeDialog() },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error updating pay source'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => paySourcesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pay-sources'] }); setDeleteTarget(null) },
    onError: (err: unknown) => setApiError(err instanceof Error ? err.message : 'Error deleting'),
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

  function openEdit(ps: PaySource) {
    setEditing(ps)
    reset({
      name: ps.name,
      status: ps.status as 'active' | 'inactive',
      notes: ps.notes ?? undefined,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Pay Sources</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Pay Source
          </Button>
        )}
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {!paySources.length ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">No pay sources found</td>
                </tr>
              ) : paySources.map((ps) => (
                <tr key={ps.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ps.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ps.status === 'active' ? 'accepted' : 'canceled'}>
                      {ps.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{ps.notes ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(ps)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteTarget(ps)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pay Source' : 'Add Pay Source'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input {...register('name')} placeholder="e.g. Medicaid, Medicare, Private Pay" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
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

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea {...register('notes')} rows={2} placeholder="Optional notes…" />
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
          <DialogHeader><DialogTitle>Delete Pay Source</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
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
