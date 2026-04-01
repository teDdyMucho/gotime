import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi, requestorsApi, tripsApi } from '@/lib/api'
import type { NotificationLog, Requestor, TripRequest } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Mail, MessageSquare, AtSign } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

function methodIcon(method: string) {
  if (method === 'sms') return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
  if (method === 'both') return <AtSign className="h-3.5 w-3.5 text-purple-500" />
  return <Mail className="h-3.5 w-3.5 text-gray-500" />
}

const TYPE_VARIANT: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  accepted:  'accepted',
  declined:  'declined',
  returned:  'returned',
  canceled:  'canceled',
  completed: 'completed',
  general:   'secondary',
}

const STATUS_VARIANT: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  sent:    'accepted',
  failed:  'declined',
  pending: 'pending',
}

export function NotificationLog() {
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  const { data: logs = [], isLoading, refetch } = useQuery<NotificationLog[]>({
    queryKey: ['notification-log'],
    queryFn: async () => (await notificationsApi.list()).data,
  })

  const { data: requestors = [] } = useQuery<Requestor[]>({
    queryKey: ['requestors'],
    queryFn: async () => (await requestorsApi.list()).data,
  })

  const { data: trips = [] } = useQuery<TripRequest[]>({
    queryKey: ['trips'],
    queryFn: async () => (await tripsApi.list()).data,
  })

  const requestorMap = Object.fromEntries(requestors.map((r) => [r.id, r]))
  const tripMap      = Object.fromEntries(trips.map((t) => [t.id, t]))

  const filtered = logs.filter((n) => {
    if (typeFilter !== 'all' && n.notification_type !== typeFilter) return false
    if (methodFilter !== 'all' && n.method !== methodFilter) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Notification Log</h1>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="general">General</SelectItem>
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Sent At</th>
                <th className="px-4 py-3 font-medium text-gray-600">Trip</th>
                <th className="px-4 py-3 font-medium text-gray-600">Recipient</th>
                <th className="px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Preview</th>
              </tr>
            </thead>
            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No notifications found
                  </td>
                </tr>
              ) : filtered.map((n) => {
                const requestor = requestorMap[n.requestor_id]
                const trip = tripMap[n.trip_id]
                return (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {formatDateTime(n.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-brand-600 hover:underline font-mono text-xs"
                        onClick={() => navigate(`/trips/${n.trip_id}`)}
                      >
                        {trip ? `${trip.appointment_type ?? 'Trip'} · ${trip.trip_date}` : n.trip_id}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {requestor ? (
                        <div>
                          <p className="font-medium text-gray-900 text-xs">{requestor.name}</p>
                          {requestor.title_department && (
                            <p className="text-xs text-gray-400">{requestor.title_department}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{n.requestor_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_VARIANT[n.notification_type] ?? 'secondary'} className="capitalize">
                        {n.notification_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {methodIcon(n.method)}
                        <span className="capitalize text-gray-600 text-xs">{n.method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[n.status] ?? 'secondary'} className="capitalize">
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[280px] truncate">
                      {n.message_preview ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      )}
    </div>
  )
}
