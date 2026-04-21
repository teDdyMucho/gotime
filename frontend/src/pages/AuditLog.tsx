import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
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

export function AuditLog() {
  const [page, setPage] = useState(0)
  const [entityType, setEntityType] = useState('all')
  const [search, setSearch] = useState('')

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
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search entity ID, user, action…"
            className="pl-8 h-8 text-xs bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0) }}>
          <SelectTrigger className="w-40 h-8 text-xs">
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-brand-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entity</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fields</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!filtered?.length ? (
                  <tr><td colSpan={7} className="text-center py-14 text-gray-400 text-sm">No audit entries found</td></tr>
                ) : filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide capitalize">
                        {e.entity_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[110px] truncate">{e.entity_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-700 text-xs capitalize">{e.action.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[110px] truncate">{e.user_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.changed_fields?.join(', ') ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{e.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {page + 1} · {filtered?.length ?? 0} entries
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={!data || data.length < PAGE_SIZE}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
