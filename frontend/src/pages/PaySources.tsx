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
    <div className="space-y-5">
      <div className="flex items-center gap-3 justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button size="sm" onClick={openCreate} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Pay Source
          </Button>
        )}
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                {isAdmin && <th className="px-4 py-2.5 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!paySources.length ? (
                <tr>
                  <td colSpan={4} className="text-center py-14 text-gray-400 text-sm">No pay sources found</td>
                </tr>
              ) : paySources.map((ps) => (
                <tr key={ps.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 text-sm">{ps.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ps.status === 'active' ? 'accepted' : 'canceled'} className="text-[11px]">
                      {ps.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{ps.notes ?? '—'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(ps)}>
                          <Pencil className="h-3.5 w-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(ps)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name *</Label>
                <Input {...register('name')} placeholder="e.g. Medicaid, Medicare, Private Pay" />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</Label>
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
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</Label>
                <Textarea {...register('notes')} rows={3} placeholder="Optional notes…" className="resize-none" />
              </div>
              {apiError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{apiError}</div>}
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
            <DialogTitle>{apiError ? 'Cannot Delete Pay Source' : 'Delete Pay Source'}</DialogTitle>
          </DialogHeader>
          {apiError ? (
            <>
              <div className="px-6 py-5">
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 space-y-1.5">
                  <p className="font-semibold">{deleteTarget?.name} cannot be deleted</p>
                  <p>{apiError}</p>
                  <p className="text-xs text-amber-600">Remove all linked trips and clients first.</p>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm" className="w-full" onClick={() => { setDeleteTarget(null); setApiError(null) }}>Got it</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
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
