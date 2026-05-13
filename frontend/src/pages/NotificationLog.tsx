import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { notificationsApi, requestorsApi, tripsApi, clientsApi } from '@/lib/api'
import type { NotificationLog, Requestor, TripRequest, Client } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { RefreshCw, Mail, MessageSquare, AtSign, Bell, CheckCircle2, XCircle, Clock, Search, X } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

function maskClientName(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  accepted:     { label: 'Accepted',     color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  declined:     { label: 'Declined',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  returned:     { label: 'Returned',     color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  canceled:     { label: 'Canceled',     color: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-200' },
  completed:    { label: 'Completed',    color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  general:      { label: 'General Alert',color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  manual_alert: { label: 'General Alert',color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  sent:    { icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'Sent' },
  failed:  { icon: XCircle,     color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200',   label: 'Failed' },
  pending: { icon: Clock,       color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Pending' },
}

const METHOD_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail,          label: 'Email',       color: 'text-blue-500' },
  sms:   { icon: MessageSquare, label: 'SMS',         color: 'text-violet-500' },
  both:  { icon: AtSign,        label: 'Email + SMS', color: 'text-teal-500' },
}

interface DetailModalProps {
  log: NotificationLog
  requestorName?: string
  tripLabel?: string
  clientName?: string
  onClose: () => void
}

function DetailModal({ log, requestorName, tripLabel, clientName, onClose }: DetailModalProps) {
  const typeConf   = TYPE_CONFIG[log.notification_type] ?? TYPE_CONFIG['general']
  const statusConf = STATUS_CONFIG[log.status]
  const methodConf = METHOD_CONFIG[log.method]
  const StatusIcon = statusConf?.icon
  const MethodIcon = methodConf?.icon

  const previewLabel = (() => {
    const raw = log.message_preview as string | null
    if (!raw) return '—'
    const map: Record<string, string> = { manual_alert: 'General Alert', trip_decision: 'Trip Update', canceled: 'Trip Canceled' }
    return map[raw] ?? raw
  })()

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" aria-describedby={undefined}>

        {/* Header with dark bg like email letterhead */}
        <div className="bg-brand-600 px-6 py-5">
          <DialogTitle className="sr-only">Notification Details</DialogTitle>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-brand-200 uppercase tracking-[2px] mb-1">GoTime Transportation</p>
              <h2 className="text-lg font-bold text-white leading-tight">Notification Details</h2>
              <p className="text-xs text-brand-200 mt-0.5">Dispatch Delivery Record</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-brand-200 uppercase tracking-widest">Sent</p>
              <p className="text-xs font-semibold text-white mt-0.5">{formatDateTime(log.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Delivery status bar */}
        <div className={`flex items-center gap-2 px-6 py-2.5 border-b border-gray-100 ${statusConf?.bg ?? 'bg-gray-50'}`}>
          {statusConf && StatusIcon && <StatusIcon className={`h-3.5 w-3.5 ${statusConf.color}`} />}
          <span className={`text-xs font-semibold ${statusConf?.color ?? 'text-gray-500'}`}>
            {statusConf?.label ?? '—'} — {methodConf?.label ?? '—'}
            {MethodIcon && <MethodIcon className={`inline h-3.5 w-3.5 ml-1.5 ${methodConf?.color}`} />}
          </span>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">

          {/* Recipient & Client */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Recipient</p>
              <p className="text-sm font-semibold text-gray-900">{requestorName ?? '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Client</p>
              <p className="text-sm font-semibold text-gray-900">{clientName ?? '—'}</p>
            </div>
          </div>

          {/* Trip */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Trip</p>
            <p className="text-sm font-semibold text-gray-900">{tripLabel ?? '—'}</p>
          </div>

          {/* Type & Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Type</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${typeConf.bg} ${typeConf.color} ${typeConf.border}`}>
                {typeConf.label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Alert Type</p>
              <p className="text-sm font-semibold text-gray-900">{previewLabel}</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">GoTime Dispatch System</p>
          <Button size="sm" className="h-8 px-5 text-xs bg-brand-600 hover:bg-brand-700" onClick={onClose}>Close</Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}

export function NotificationLog() {
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter]     = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [search, setSearch]             = useState<string>('')
  const [selected, setSelected]         = useState<NotificationLog | null>(null)

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
    const rawType = n.notification_type as string
    const type = rawType === 'manual_alert' ? 'general' : rawType
    if (typeFilter !== 'all' && type !== typeFilter) return false
    if (methodFilter !== 'all' && n.method !== methodFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const requestor   = requestorMap[n.requestor_id]
      const trip        = tripMap[n.trip_id]
      const clientName  = trip ? clientMap[trip.client_id] ?? '' : ''
      const matchesRecipient = requestor?.name?.toLowerCase().includes(q) ?? false
      const matchesClient    = clientName.toLowerCase().includes(q)
      const matchesTrip      = trip ? `${trip.appointment_type ?? ''} ${trip.trip_date}`.toLowerCase().includes(q) : false
      const matchesMethod    = n.method.toLowerCase().includes(q)
      const matchesStatus    = n.status.toLowerCase().includes(q)
      if (!matchesRecipient && !matchesClient && !matchesTrip && !matchesMethod && !matchesStatus) return false
    }
    return true
  })

  const sentCount    = logs.filter((n) => n.status === 'sent').length
  const failedCount  = logs.filter((n) => n.status === 'failed').length
  const pendingCount = logs.filter((n) => n.status === 'pending').length

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header ── */}
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipient, client, trip…"
                className="h-8 pl-8 pr-7 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 w-56 placeholder:text-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                <SelectItem value="accepted" className="text-xs">Accepted</SelectItem>
                <SelectItem value="declined" className="text-xs">Declined</SelectItem>
                <SelectItem value="returned" className="text-xs">Returned</SelectItem>
                <SelectItem value="canceled" className="text-xs">Canceled</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
                <SelectItem value="general" className="text-xs">General Alert</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Methods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Methods</SelectItem>
                <SelectItem value="email" className="text-xs">Email</SelectItem>
                <SelectItem value="sms" className="text-xs">SMS</SelectItem>
                <SelectItem value="both" className="text-xs">Both</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => refetch()}>
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
                  const requestor    = requestorMap[n.requestor_id]
                  const trip         = tripMap[n.trip_id]
                  const rawClient    = trip ? clientMap[trip.client_id] : undefined
                  const maskedClient = rawClient ? maskClientName(rawClient) : null
                  const typeConf     = TYPE_CONFIG[n.notification_type] ?? TYPE_CONFIG['general']
                  const statusConf   = STATUS_CONFIG[n.status]
                  const methodConf   = METHOD_CONFIG[n.method]
                  const StatusIcon   = statusConf?.icon
                  const MethodIcon   = methodConf?.icon

                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelected(n)}
                      className="grid grid-cols-[1.3fr_0.9fr_1.5fr_1.3fr_0.9fr_0.8fr_0.8fr_2fr] gap-0 items-center px-5 py-3.5 hover:bg-brand-50/40 transition-colors cursor-pointer"
                    >
                      {/* Sent At */}
                      <div className="pr-3 min-w-0">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(n.created_at)}</p>
                      </div>

                      {/* Client */}
                      <div className="pr-3 min-w-0">
                        {maskedClient
                          ? <p className="text-xs font-semibold text-gray-700 truncate">{maskedClient}</p>
                          : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Trip */}
                      <div className="pr-3 min-w-0">
                        <button
                          className="text-brand-600 hover:text-brand-700 hover:underline font-medium text-xs truncate block max-w-full text-left"
                          onClick={(e) => { e.stopPropagation(); navigate(`/trips/${n.trip_id}`) }}
                        >
                          {trip ? `${trip.appointment_type ?? 'Trip'} · ${trip.trip_date}` : '—'}
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
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </div>

                      {/* Type */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${typeConf.bg} ${typeConf.color} ${typeConf.border}`}>
                          {typeConf.label}
                        </span>
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

      {/* ── Detail Modal ── */}
      {selected && (
        <DetailModal
          log={selected}
          requestorName={requestorMap[selected.requestor_id]?.name}
          tripLabel={tripMap[selected.trip_id] ? `${tripMap[selected.trip_id].appointment_type ?? 'Trip'} · ${tripMap[selected.trip_id].trip_date}` : undefined}
          clientName={(() => {
            const trip = tripMap[selected.trip_id]
            const raw  = trip ? clientMap[trip.client_id] : undefined
            return raw ? maskClientName(raw) : undefined
          })()}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
