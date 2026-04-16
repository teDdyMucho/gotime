import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTrips } from '@/hooks/useTrips'
import { facilitiesApi, clientsApi, paySourcesApi } from '@/lib/api'
import type { Facility, Client, PaySource, ReviewState, UrgencyLevel } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Search, Plus, RefreshCw, ArrowUpDown, Download } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'
import api from '@/lib/api'

const STATE_OPTIONS: { value: ReviewState | 'all'; label: string }[] = [
  { value: 'all',              label: 'All States' },
  { value: 'pending',          label: 'Pending' },
  { value: 'accepted',         label: 'Accepted' },
  { value: 'declined',         label: 'Declined' },
  { value: 'returned',         label: 'Returned' },
  { value: 'canceled',         label: 'Canceled' },
  { value: 'completed',        label: 'Completed' },
  { value: 'arrived_canceled', label: 'Arrived/Canceled' },
]

const INTAKE_CHANNEL_LABELS: Record<string, string> = {
  phone: 'Phone', email: 'Email', fax: 'Fax', portal: 'Portal', internal: 'Internal',
}

function stateBadge(s: ReviewState) {
  const map: Record<ReviewState, string> = {
    pending: 'pending', accepted: 'accepted', declined: 'declined',
    returned: 'returned', canceled: 'canceled', completed: 'completed',
    arrived_canceled: 'arrived_canceled',
  }
  return (map[s] ?? 'secondary') as Parameters<typeof Badge>[0]['variant']
}

function urgencyBadge(u: UrgencyLevel) {
  return (u === 'emergency' ? 'emergency' : u === 'urgent' ? 'urgent' : 'standard') as Parameters<typeof Badge>[0]['variant']
}


type SortKey = 'trip_date' | 'urgency_level' | 'intake_date'

const URGENCY_ORDER: Record<UrgencyLevel, number> = { emergency: 0, urgent: 1, standard: 2 }

export function DispatcherQueue() {
  const navigate = useNavigate()
  const [stateFilter, setStateFilter]       = useState<string>('all')
  const [facilityFilter, setFacilityFilter] = useState<string>('all')
  const [paySourceFilter, setPaySourceFilter] = useState<string>('all')
  const [missingOnly, setMissingOnly]       = useState(false)
  const [search, setSearch]                 = useState('')
  const [sortKey, setSortKey]               = useState<SortKey>('trip_date')
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')

  const params: Record<string, string> = {}
  if (stateFilter !== 'all')     params.review_state  = stateFilter
  if (facilityFilter !== 'all')  params.facility_id   = facilityFilter
  if (paySourceFilter !== 'all') params.pay_source_id = paySourceFilter
  if (missingOnly)               params.missing_info_flag = 'true'

  const { data: trips = [], isLoading, refetch } = useTrips(params)

  const { data: facilities  = [] } = useQuery<Facility[]>({ queryKey: ['facilities'],   queryFn: async () => (await facilitiesApi.list()).data })
  const { data: clients     = [] } = useQuery<Client[]>({ queryKey: ['clients'],        queryFn: async () => (await clientsApi.list()).data })
  const { data: paySources  = [] } = useQuery<PaySource[]>({ queryKey: ['pay-sources'], queryFn: async () => (await paySourcesApi.list()).data })

  const facilityMap   = Object.fromEntries(facilities.map((f) => [f.id, f]))
  const clientMap     = Object.fromEntries(clients.map((c) => [c.id, c.full_name]))
  const paySourceMap  = Object.fromEntries(paySources.map((p) => [p.id, p.name]))

  const filtered = trips
    .filter((t) => {
      if (dateFrom && t.trip_date < dateFrom) return false
      if (dateTo   && t.trip_date > dateTo)   return false
      if (!search) return true
      const q = search.toLowerCase()
      const fac = t.facility_id ? facilityMap[t.facility_id] : null
      return (
        t.dropoff_location_name?.toLowerCase().includes(q) ||
        fac?.name?.toLowerCase().includes(q) ||
        t.pickup_address?.toLowerCase().includes(q) ||
        t.intake_channel?.toLowerCase().includes(q) ||
        t.trip_order_id?.toLowerCase().includes(q) ||
        t.appointment_type?.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortKey === 'urgency_level') return URGENCY_ORDER[a.urgency_level] - URGENCY_ORDER[b.urgency_level]
      if (sortKey === 'intake_date')   return b.intake_date.localeCompare(a.intake_date)
      return a.trip_date.localeCompare(b.trip_date)
    })

  const pendingCount = trips.filter((t) => t.review_state === 'pending').length

  async function handleExportCsv() {
    const exportParams = new URLSearchParams()
    if (stateFilter !== 'all')     exportParams.set('review_state',  stateFilter)
    if (facilityFilter !== 'all')  exportParams.set('facility_id',   facilityFilter)
    if (paySourceFilter !== 'all') exportParams.set('pay_source_id', paySourceFilter)
    const res = await api.get(`/trips/export?${exportParams.toString()}`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `gotime_trips_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Trip Queue</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button onClick={() => navigate('/intake')}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search facility, drop-off, appt type…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            className="w-36 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Trip date from"
          />
          <span className="text-gray-400 text-sm">–</span>
          <Input
            type="date"
            className="w-36 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Trip date to"
          />
        </div>

        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={facilityFilter} onValueChange={setFacilityFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Facilities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Facilities</SelectItem>
            {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={paySourceFilter} onValueChange={setPaySourceFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Pay Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pay Sources</SelectItem>
            {paySources.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button
          variant={missingOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMissingOnly((v) => !v)}
          className={missingOnly ? 'bg-amber-500 hover:bg-amber-600' : ''}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Missing Info
        </Button>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-40">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 opacity-60" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trip_date">Sort: Trip Date</SelectItem>
            <SelectItem value="urgency_level">Sort: Urgency</SelectItem>
            <SelectItem value="intake_date">Sort: Intake Date</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Trip Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Pick-up Location</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Drop-Off Location</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Appt Time</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Intake Channel</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Pay Source</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Urgency</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Appt Type</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Flag</th>
                  <th className="px-4 py-3 font-medium text-gray-600">State</th>
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">No trips found</td></tr>
                ) : filtered.map((trip) => {
                  const fac = trip.facility_id ? facilityMap[trip.facility_id] : null
                  const pickupName    = fac?.name ?? null
                  const pickupAddr    = fac?.address ?? trip.pickup_address ?? null
                  const dropoffName   = trip.dropoff_location_name ?? null
                  const dropoffAddr   = trip.dropoff_address ?? null

                  return (
                    <tr
                      key={trip.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(trip.trip_date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{clientMap[trip.client_id] ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {pickupName
                          ? <><div className="font-medium text-gray-900 truncate">{pickupName}</div>
                              {pickupAddr && <div className="text-xs text-gray-400 truncate">{pickupAddr}</div>}</>
                          : <span className="text-gray-500 text-xs">{pickupAddr ?? '—'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 max-w-[180px]">
                        {dropoffName
                          ? <><div className="font-medium text-gray-900 truncate">{dropoffName}</div>
                              {dropoffAddr && <div className="text-xs text-gray-400 truncate">{dropoffAddr}</div>}</>
                          : <span className="text-gray-500 text-xs">{dropoffAddr ?? '—'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(trip.appointment_time) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{INTAKE_CHANNEL_LABELS[trip.intake_channel] ?? trip.intake_channel}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{trip.pay_source_id ? (paySourceMap[trip.pay_source_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={urgencyBadge(trip.urgency_level)} className="capitalize">
                          {trip.urgency_level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{trip.appointment_type ?? '—'}</td>
                      <td className="px-4 py-3">
                        {trip.missing_info_flag && (
                          <span title="Missing info">
                            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stateBadge(trip.review_state)} className="capitalize whitespace-nowrap">
                          {trip.review_state.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(trip.intake_date)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
            {filtered.length} trip{filtered.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      )}
    </div>
  )
}
