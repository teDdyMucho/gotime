import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi, requestorsApi, tripsApi, clientsApi } from '@/lib/api'
import type { NotificationLog, Requestor, TripRequest, Client } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Mail, MessageSquare, AtSign } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

/** PHI-safe: "John Doe" → "J. Doe" */
function maskClientName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

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

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await clientsApi.list()).data,
  })

  const requestorMap = Object.fromEntries(requestors.map((r) => [r.id, r]))
  const tripMap      = Object.fromEntries(trips.map((t) => [t.id, t]))
  const clientMap    = Object.fromEntries(clients.map((c) => [c.id, c.full_name]))

  const filtered = logs.filter((n) => {
    if (typeFilter !== 'all' && n.notification_type !== typeFilter) return false
    if (methodFilter !== 'all' && n.method !== methodFilter) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Types</SelectItem>
              <SelectItem value="accepted" className="text-xs">Accepted</SelectItem>
              <SelectItem value="declined" className="text-xs">Declined</SelectItem>
              <SelectItem value="returned" className="text-xs">Returned</SelectItem>
              <SelectItem value="canceled" className="text-xs">Canceled</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="general" className="text-xs">General</SelectItem>
            </SelectContent>
          </Select>

          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Methods</SelectItem>
              <SelectItem value="email" className="text-xs">Email</SelectItem>
              <SelectItem value="sms" className="text-xs">SMS</SelectItem>
              <SelectItem value="both" className="text-xs">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
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
              <tr className="border-b border-gray-100 bg-gray-50/70 text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sent At</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trip</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Method</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!filtered.length ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 text-sm">No notifications found</td>
                </tr>
              ) : filtered.map((n) => {
                const requestor    = requestorMap[n.requestor_id]
                const trip         = tripMap[n.trip_id]
                const rawClientName= trip ? clientMap[trip.client_id] : undefined
                const maskedClient = rawClientName ? maskClientName(rawClientName) : null
                return (
                  <tr key={n.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(n.created_at)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">
                      {maskedClient ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-brand-600 hover:underline font-medium text-xs"
                        onClick={() => navigate(`/trips/${n.trip_id}`)}
                      >
                        {trip ? `${trip.appointment_type ?? 'Trip'} · ${trip.trip_date}` : n.trip_id}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {requestor ? (
                        <div>
                          <p className="font-medium text-gray-800 text-xs">{requestor.name}</p>
                          {requestor.title_department && (
                            <p className="text-[11px] text-gray-400">{requestor.title_department}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">{n.requestor_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_VARIANT[n.notification_type] ?? 'secondary'} className="capitalize text-[11px]">
                        {n.notification_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {methodIcon(n.method)}
                        <span className="capitalize text-gray-500 text-xs">{n.method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[n.status] ?? 'secondary'} className="capitalize text-[11px]">
                        {n.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[260px] truncate">
                      {n.message_preview ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
            {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
