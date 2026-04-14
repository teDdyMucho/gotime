import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { facilitiesApi, paySourcesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import type { Facility, PaySource } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  facility_type: z.enum(['hospital', 'clinic', 'SNF', 'home_health', 'other']).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  default_pay_source_id: z.string().optional(),
  internal_notes: z.string().optional(),
  account_notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function Facilities() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Facility | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: facilities = [], isLoading } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list()).data,
  })

  const { data: paySources = [] } = useQuery<PaySource[]>({
    queryKey: ['pay-sources'],
    queryFn: async () => (await paySourcesApi.list()).data,
  })

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
      default_pay_source_id: f.default_pay_source_id,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Facilities</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Facility
          </Button>
        )}
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {facilities.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{f.facility_type?.replace(/_/g, ' ') ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{f.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={f.status === 'active' ? 'accepted' : 'canceled'}>
                      {f.status}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                        <Pencil className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Facility' : 'Add Facility'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Controller name="facility_type" control={control} render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {['hospital', 'clinic', 'SNF', 'home_health', 'other'].map((v) => (
                        <SelectItem key={v} value={v} className="capitalize">{v.replace(/_/g, ' ')}</SelectItem>
                      ))}
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

              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input {...register('phone')} />
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input {...register('email')} type="email" />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Address</Label>
                <Input {...register('address')} />
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
                <Label>Internal Notes</Label>
                <Textarea {...register('internal_notes')} rows={2} />
              </div>

              <div className="space-y-1.5">
                <Label>Account Notes</Label>
                <Textarea {...register('account_notes')} rows={2} />
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
    </div>
  )
}
