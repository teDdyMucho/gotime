import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tripsApi } from '@/lib/api'
import type { TripRequest } from '@/lib/types'

export function useTrips(params?: Record<string, string>) {
  return useQuery<TripRequest[]>({
    queryKey: ['trips', params],
    queryFn: async () => {
      const res = await tripsApi.list(params)
      return res.data
    },
  })
}

export function useTrip(id: string) {
  return useQuery<TripRequest>({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await tripsApi.get(id)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => tripsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}

export function useReviewTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; action: string; decline_reason?: string; review_notes?: string }) =>
      tripsApi.review(id, data as Parameters<typeof tripsApi.review>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export function useCancelTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; cancellation_reason: string; review_notes?: string }) =>
      tripsApi.cancel(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  })
}
