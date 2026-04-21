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
  if (stateFilter !== 'all')     params.review_state      = stateFilter
  if (facilityFilter !== 'all')  params.facility_id       = facilityFilter
  if (paySourceFilter !== 'all') params.pay_source_id     = paySourceFilter
  if (missingOnly)               params.missing_info_flag = 'true'

  const { data: trips = [], isLoading, refetch } = useTrips(params)
  const { data: facilities  = [] } = useQuery<Facility[]>({ queryKey: ['facilities'],   queryFn: async () => (await facilitiesApi.list()).data })
  const { data: clients     = [] } = useQuery<Client[]>({ queryKey: ['clients'],        queryFn: async () => (await clientsApi.list()).data })
  const { data: paySources  = [] } = useQuery<PaySource[]>({ queryKey: ['pay-sources'], queryFn: async () => (await paySourcesApi.list()).data })

  const facilityMap  = Object.fromEntries(facilities.map((f) => [f.id, f]))
  const clientMap    = Object.fromEntries(clients.map((c) => [c.id, c.full_name]))
  const paySourceMap = Object.fromEntries(paySources.map((p) => [p.id, p.name]))

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              {pendingCount} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-8 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => navigate('/intake')} className="h-8 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search facility, drop-off, appt type…"
              className="pl-8 h-8 text-xs bg-gray-50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="w-32 h-8 text-xs bg-gray-50"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From"
            />
            <span className="text-gray-300 text-sm">–</span>
            <Input
              type="date"
              className="w-32 h-8 text-xs bg-gray-50"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To"
            />
          </div>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={facilityFilter} onValueChange={setFacilityFilter}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Facilities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Facilities</SelectItem>
              {facilities.map((f) => <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={paySourceFilter} onValueChange={setPaySourceFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Pay Sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Pay Sources</SelectItem>
              {paySources.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <button
            onClick={() => setMissingOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
              missingOnly
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Missing Info
          </button>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1.5 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trip_date"     className="text-xs">Sort: Trip Date</SelectItem>
              <SelectItem value="urgency_level" className="text-xs">Sort: Urgency</SelectItem>
              <SelectItem value="intake_date"   className="text-xs">Sort: Intake Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()} className="h-8 w-8 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-brand-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Trip Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pick-up</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Drop-off</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Appt</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Channel</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Pay Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Appt Type</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!filtered.length ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-gray-400 text-sm">
                      No trips found
                    </td>
                  </tr>
                ) : filtered.map((trip) => {
                  const fac        = trip.facility_id ? facilityMap[trip.facility_id] : null
                  const pickupName = fac?.name ?? null
                  const pickupAddr = fac?.address ?? trip.pickup_address ?? null
                  const dropoffName= trip.dropoff_location_name ?? null
                  const dropoffAddr= trip.dropoff_address ?? null

                  return (
                    <tr
                      key={trip.id}
                      className="hover:bg-brand-50/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/trips/${trip.id}`)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap text-sm">{formatDate(trip.trip_date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[130px] truncate text-sm">{clientMap[trip.client_id] ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {pickupName
                          ? <><div className="font-medium text-gray-900 truncate text-sm">{pickupName}</div>
                              {pickupAddr && <div className="text-xs text-gray-400 truncate">{pickupAddr}</div>}</>
                          : <span className="text-gray-500 text-xs">{pickupAddr ?? '—'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {dropoffName
                          ? <><div className="font-medium text-gray-900 truncate text-sm">{dropoffName}</div>
                              {dropoffAddr && <div className="text-xs text-gray-400 truncate">{dropoffAddr}</div>}</>
                          : <span className="text-gray-500 text-xs">{dropoffAddr ?? '—'}</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{formatTime(trip.appointment_time) ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs capitalize">{INTAKE_CHANNEL_LABELS[trip.intake_channel] ?? trip.intake_channel}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{trip.pay_source_id ? (paySourceMap[trip.pay_source_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={urgencyBadge(trip.urgency_level)} className="capitalize text-[11px]">
                          {trip.urgency_level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[110px] truncate">{trip.appointment_type ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {trip.missing_info_flag && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stateBadge(trip.review_state)} className="capitalize whitespace-nowrap text-[11px]">
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
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
            {filtered.length} trip{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
