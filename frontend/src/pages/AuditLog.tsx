import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi, tripsApi, clientsApi, facilitiesApi, requestorsApi, paySourcesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, ScrollText, Shield } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { TripRequest, Client, Facility, Requestor, PaySource } from '@/lib/types'

interface AuditEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  user_id: string
  ip_address?: string
  changed_fields?: string[]
  new_value?: Record<string, unknown>
  old_value?: Record<string, unknown>
  created_at: string
}

const PAGE_SIZE = 50

const ACTION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  create: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  update: { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  delete: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  access: { color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

const ENTITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  trip_request: { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  client:       { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  facility:     { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  requestor:    { color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  pay_source:   { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200' },
}

function getActionConf(action: string) {
  const key = action.toLowerCase().split('_')[0]
  return ACTION_CONFIG[key] ?? { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
}

function shortId(id: string) {
  return id.slice(0, 8)
}

function buildDescription(
  e: AuditEntry,
  actorLabel: string,
  entityName: string | null,
): string {
  const entity = e.entity_type.replace(/_/g, ' ')
  const name   = entityName ? `"${entityName}"` : `#${shortId(e.entity_id)}`
  const fields = e.changed_fields?.length
    ? ` (${e.changed_fields.slice(0, 3).join(', ')}${e.changed_fields.length > 3 ? '…' : ''})`
    : ''

  switch (e.action) {
    case 'create': return `${actorLabel} created ${entity} ${name}`
    case 'update': return `${actorLabel} updated ${entity} ${name}${fields}`
    case 'delete': return `${actorLabel} deleted ${entity} ${name}`
    case 'access': return `${actorLabel} viewed ${entity} ${name}`
    case 'accept': return `${actorLabel} accepted trip ${name}`
    case 'decline': return `${actorLabel} declined trip ${name}`
    case 'complete': return `${actorLabel} completed trip ${name}`
    case 'cancel': return `${actorLabel} canceled trip ${name}`
    case 'return': return `${actorLabel} returned trip ${name}`
    default:       return `${actorLabel} performed "${e.action.replace(/_/g, ' ')}" on ${entity} ${name}`
  }
}

export function AuditLog() {
  const { user: currentUser } = useAuth()
  const [page, setPage]             = useState(0)
  const [entityType, setEntityType] = useState('all')
  const [search, setSearch]         = useState('')

  const params: Record<string, string> = {
    page: String(page + 1),
    page_size: String(PAGE_SIZE),
  }
  if (entityType !== 'all') params.entity_type = entityType

  const { data, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit', params],
    queryFn: async () => (await auditApi.list(params)).data,
  })

  const { data: trips = [] }      = useQuery<TripRequest[]>({ queryKey: ['trips'],      queryFn: async () => (await tripsApi.list()).data })
  const { data: clients = [] }    = useQuery<Client[]>({     queryKey: ['clients'],     queryFn: async () => (await clientsApi.list()).data })
  const { data: facilities = [] } = useQuery<Facility[]>({   queryKey: ['facilities'],  queryFn: async () => (await facilitiesApi.list({ status: 'all' })).data })
  const { data: requestors = [] } = useQuery<Requestor[]>({  queryKey: ['requestors'],  queryFn: async () => (await requestorsApi.list({ status: 'all' })).data })
  const { data: paySources = [] } = useQuery<PaySource[]>({  queryKey: ['pay-sources'], queryFn: async () => (await paySourcesApi.list()).data })

  const tripMap       = Object.fromEntries(trips.map((t) => [t.id, `Trip ${t.trip_date}${t.appointment_type ? ' · ' + t.appointment_type : ''}`]))
  const clientMap     = Object.fromEntries(clients.map((c) => [c.id, c.full_name]))
  const facilityMap   = Object.fromEntries(facilities.map((f) => [f.id, f.name]))
  const requestorMap  = Object.fromEntries(requestors.map((r) => [r.id, r.name]))
  const paySourceMap  = Object.fromEntries(paySources.map((p) => [p.id, p.name]))

  function resolveEntityName(e: AuditEntry): string | null {
    switch (e.entity_type) {
      case 'trip_request': return tripMap[e.entity_id] ?? null
      case 'client':       return clientMap[e.entity_id] ?? null
      case 'facility':     return facilityMap[e.entity_id] ?? null
      case 'requestor':    return requestorMap[e.entity_id] ?? null
      case 'pay_source':   return paySourceMap[e.entity_id] ?? null
      default:             return null
    }
  }

  function resolveActor(userId: string): string {
    if (userId === currentUser?.user_id) return currentUser?.email ?? 'You'
    // Show shortened UUID since we don't have a user list endpoint
    return `User …${userId.slice(-8)}`
  }

  const filtered = data?.filter((e) => {
    if (!search) return true
    const q    = search.toLowerCase()
    const name = resolveEntityName(e)?.toLowerCase() ?? ''
    return (
      e.entity_id.toLowerCase().includes(q) ||
      e.user_id.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.entity_type.toLowerCase().includes(q) ||
      name.includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <ScrollText className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Audit Log</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Complete system activity trail &middot; Page {page + 1}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search name, user, action…"
                className="h-8 pl-8 pr-3 text-xs w-56 bg-gray-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0) }}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Types</SelectItem>
                <SelectItem value="trip_request" className="text-xs">Trip</SelectItem>
                <SelectItem value="client" className="text-xs">Client</SelectItem>
                <SelectItem value="facility" className="text-xs">Facility</SelectItem>
                <SelectItem value="requestor" className="text-xs">Requestor</SelectItem>
                <SelectItem value="pay_source" className="text-xs">Pay Source</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-brand-600" />
              <p className="text-xs text-gray-400 font-medium">Loading audit log…</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[1.3fr_3fr_0.8fr_0.8fr_1fr] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
              {['Timestamp', 'Activity', 'Entity', 'Action', 'IP'].map((h) => (
                <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {!filtered?.length ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No audit entries found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((e) => {
                  const entityConf  = ENTITY_CONFIG[e.entity_type] ?? { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                  const actConf     = getActionConf(e.action)
                  const entityName  = resolveEntityName(e)
                  const actorLabel  = resolveActor(e.user_id)
                  const description = buildDescription(e, actorLabel, entityName)

                  return (
                    <div
                      key={e.id}
                      className="grid grid-cols-[1.3fr_3fr_0.8fr_0.8fr_1fr] gap-0 items-start px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                    >
                      {/* Timestamp */}
                      <div className="pr-4 pt-0.5">
                        <p className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(e.created_at)}</p>
                      </div>

                      {/* Activity — human readable description */}
                      <div className="pr-4 min-w-0">
                        <p className="text-sm font-medium text-gray-800 leading-snug">{description}</p>
                        {e.changed_fields && e.changed_fields.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {e.changed_fields.slice(0, 4).map((f) => (
                              <span key={f} className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500">{f}</span>
                            ))}
                            {e.changed_fields.length > 4 && (
                              <span className="text-[10px] text-gray-400 self-center">+{e.changed_fields.length - 4} more</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Entity type badge */}
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${entityConf.bg} ${entityConf.color} ${entityConf.border}`}>
                          {e.entity_type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Action badge */}
                      <div className="pt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${actConf.bg} ${actConf.color} ${actConf.border}`}>
                          {e.action.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* IP */}
                      <div className="pt-0.5">
                        <p className="text-[11px] text-gray-400 font-mono">{e.ip_address ?? '—'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Footer */}
            {(filtered?.length ?? 0) > 0 && (
              <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Page {page + 1} &middot; {filtered?.length ?? 0} entries shown
                </p>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="sm" className="h-7 w-7 p-0"
                    disabled={!data || data.length < PAGE_SIZE}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
