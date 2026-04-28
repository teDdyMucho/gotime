import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi, requestorsApi, tripsApi, clientsApi } from '@/lib/api'
import type { NotificationLog, Requestor, TripRequest, Client } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RefreshCw, Mail, MessageSquare, AtSign, Bell, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

function maskClientName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  accepted:  { label: 'Accepted',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  declined:  { label: 'Declined',  color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  returned:  { label: 'Returned',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  canceled:  { label: 'Canceled',  color: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-200' },
  completed: { label: 'Completed', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  general:   { label: 'General',   color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  sent:    { icon: CheckCircle2, color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', label: 'Sent' },
  failed:  { icon: XCircle,      color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   label: 'Failed' },
  pending: { icon: Clock,        color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', label: 'Pending' },
}

const METHOD_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail,          label: 'Email',      color: 'text-blue-500' },
  sms:   { icon: MessageSquare, label: 'SMS',        color: 'text-violet-500' },
  both:  { icon: AtSign,        label: 'Email + SMS',color: 'text-teal-500' },
}

export function NotificationLog() {
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter]     = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery<NotificationLog[]>({
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

  const sentCount    = logs.filter((n) => n.status === 'sent').length
  const failedCount  = logs.filter((n) => n.status === 'failed').length
  const pendingCount = logs.filter((n) => n.status === 'pending').length

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Notifications</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {logs.length} total &middot;
                <span className="text-green-600 font-semibold"> {sentCount} sent</span>
                {failedCount > 0 && <span className="text-red-500 font-semibold"> &middot; {failedCount} failed</span>}
                {pendingCount > 0 && <span className="text-amber-500 font-semibold"> &middot; {pendingCount} pending</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-40">
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
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Methods</SelectItem>
                <SelectItem value="email" className="text-xs">Email</SelectItem>
                <SelectItem value="sms" className="text-xs">SMS</SelectItem>
                <SelectItem value="both" className="text-xs">Both</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline" size="sm"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => refetch()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-brand-600" />
              <p className="text-xs text-gray-400 font-medium">Loading notifications…</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.3fr_0.9fr_1.5fr_1.3fr_0.9fr_0.8fr_0.8fr_2fr] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
              {['Sent At', 'Client', 'Trip', 'Recipient', 'Type', 'Method', 'Status', 'Preview'].map((h) => (
                <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No notifications found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((n) => {
                  const requestor     = requestorMap[n.requestor_id]
                  const trip          = tripMap[n.trip_id]
                  const rawClientName = trip ? clientMap[trip.client_id] : undefined
                  const maskedClient  = rawClientName ? maskClientName(rawClientName) : null
                  const typeConf      = TYPE_CONFIG[n.notification_type]
                  const statusConf    = STATUS_CONFIG[n.status]
                  const methodConf    = METHOD_CONFIG[n.method]
                  const StatusIcon    = statusConf?.icon
                  const MethodIcon    = methodConf?.icon

                  return (
                    <div
                      key={n.id}
                      className="grid grid-cols-[1.3fr_0.9fr_1.5fr_1.3fr_0.9fr_0.8fr_0.8fr_2fr] gap-0 items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Sent At */}
                      <div className="pr-3 min-w-0">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(n.created_at)}</p>
                      </div>

                      {/* Client */}
                      <div className="pr-3 min-w-0">
                        {maskedClient
                          ? <p className="text-xs font-semibold text-gray-700 truncate">{maskedClient}</p>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </div>

                      {/* Trip */}
                      <div className="pr-3 min-w-0">
                        <button
                          className="text-brand-600 hover:text-brand-700 hover:underline font-medium text-xs truncate block max-w-full text-left"
                          onClick={() => navigate(`/trips/${n.trip_id}`)}
                        >
                          {trip ? `${trip.appointment_type ?? 'Trip'} · ${trip.trip_date}` : n.trip_id}
                        </button>
                      </div>

                      {/* Recipient */}
                      <div className="pr-3 min-w-0">
                        {requestor ? (
                          <div>
                            <p className="text-xs font-semibold text-gray-800 truncate">{requestor.name}</p>
                            {requestor.title_department && (
                              <p className="text-[11px] text-gray-400 truncate">{requestor.title_department}</p>
                            )}
                          </div>
                        ) : (
                          <p className="font-mono text-[11px] text-gray-400 truncate">{n.requestor_id}</p>
                        )}
                      </div>

                      {/* Type */}
                      <div>
                        {typeConf ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${typeConf.bg} ${typeConf.color} ${typeConf.border}`}>
                            {typeConf.label}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Method */}
                      <div>
                        {methodConf && MethodIcon ? (
                          <div className="flex items-center gap-1.5">
                            <MethodIcon className={`h-3.5 w-3.5 ${methodConf.color}`} />
                            <span className="text-xs text-gray-500">{methodConf.label}</span>
                          </div>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Status */}
                      <div>
                        {statusConf && StatusIcon ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${statusConf.bg} ${statusConf.color} ${statusConf.border}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConf.label}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Preview */}
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 truncate">{n.message_preview ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
              <p className="text-[11px] text-gray-400">
                Showing {filtered.length} of {logs.length} notification{logs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
