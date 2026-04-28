import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight, ScrollText, Shield } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface AuditEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  user_id: string
  ip_address?: string
  changed_fields?: string[]
  created_at: string
}

const PAGE_SIZE = 50

const ACTION_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  create: { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  update: { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  delete: { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' },
  view:   { color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
}

const ENTITY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  trip:        { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  client:      { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  facility:    { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  requestor:   { color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  pay_source:  { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-200' },
}

function actionConfig(action: string) {
  const key = action.toLowerCase().split('_')[0]
  return ACTION_CONFIG[key] ?? { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
}

export function AuditLog() {
  const [page, setPage]           = useState(0)
  const [entityType, setEntityType] = useState('all')
  const [search, setSearch]       = useState('')

  const params: Record<string, string> = {
    page: String(page + 1),
    page_size: String(PAGE_SIZE),
  }
  if (entityType !== 'all') params.entity_type = entityType

  const { data, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['audit', params],
    queryFn: async () => (await auditApi.list(params)).data,
  })

  const filtered = data?.filter((e) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      e.entity_id.toLowerCase().includes(q) ||
      e.user_id.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q)
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
                placeholder="Search ID, user, action…"
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
                <SelectItem value="trip" className="text-xs">Trip</SelectItem>
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
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1.4fr_0.8fr_1.4fr_0.9fr_1.4fr_1.8fr_0.9fr] gap-0 border-b border-gray-100 bg-gray-50/80 px-5 py-2.5">
                {['Timestamp', 'Entity', 'Entity ID', 'Action', 'User', 'Fields Changed', 'IP'].map((h) => (
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
                    const entityConf = ENTITY_CONFIG[e.entity_type] ?? { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
                    const actConf    = actionConfig(e.action)
                    return (
                      <div key={e.id} className="grid grid-cols-[1.4fr_0.8fr_1.4fr_0.9fr_1.4fr_1.8fr_0.9fr] gap-0 items-center px-5 py-3 hover:bg-gray-50/70 transition-colors">
                        {/* Timestamp */}
                        <div className="pr-3 min-w-0">
                          <p className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(e.created_at)}</p>
                        </div>

                        {/* Entity type */}
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${entityConf.bg} ${entityConf.color} ${entityConf.border}`}>
                            {e.entity_type.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Entity ID */}
                        <div className="pr-3 min-w-0">
                          <p className="font-mono text-[11px] text-gray-400 truncate">{e.entity_id}</p>
                        </div>

                        {/* Action */}
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold capitalize ${actConf.bg} ${actConf.color} ${actConf.border}`}>
                            {e.action.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* User */}
                        <div className="pr-3 min-w-0">
                          <p className="font-mono text-[11px] text-gray-400 truncate">{e.user_id}</p>
                        </div>

                        {/* Fields */}
                        <div className="pr-3 min-w-0">
                          {e.changed_fields?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {e.changed_fields.slice(0, 3).map((f) => (
                                <span key={f} className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500 truncate max-w-[80px]">{f}</span>
                              ))}
                              {e.changed_fields.length > 3 && (
                                <span className="text-[10px] text-gray-400">+{e.changed_fields.length - 3}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>

                        {/* IP */}
                        <div>
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
          </>
        )}
      </div>
    </div>
  )
}
