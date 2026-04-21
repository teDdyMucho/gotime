import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { metricsApi, facilitiesApi } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { MetricsSummary, RevenueMetrics, QualityMetrics, Facility } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STATE_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  accepted: '#22c55e',
  declined: '#ef4444',
  returned: '#3b82f6',
  canceled: '#6b7280',
  completed: '#8b5cf6',
  arrived_canceled: '#f97316',
}

const PAY_SOURCE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

function StatCard({
  label, value, sub, accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">{title}</p>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  )
}

function RevenueCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-gray-900'}`}>{formatCurrency(value)}</p>
    </div>
  )
}

export function Dashboard() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [facilityId, setFacilityId] = useState('all')

  const params: Record<string, string> = {}
  if (dateFrom)             params.date_from   = dateFrom
  if (dateTo)               params.date_to     = dateTo
  if (facilityId !== 'all') params.facility_id = facilityId

  const { data: facilities = [] } = useQuery<Facility[]>({
    queryKey: ['facilities'],
    queryFn: async () => (await facilitiesApi.list()).data,
  })

  const { data: summary, isLoading: loadingSummary } = useQuery<MetricsSummary>({
    queryKey: ['metrics-summary', params],
    queryFn: async () => (await metricsApi.summary(params)).data,
  })

  const { data: revenue, isLoading: loadingRevenue } = useQuery<RevenueMetrics>({
    queryKey: ['metrics-revenue', params],
    queryFn: async () => (await metricsApi.revenue(params)).data,
  })

  const { data: byFacility, isLoading: loadingFacility } = useQuery<{ facility_name: string; total: number; accepted: number; declined: number }[]>({
    queryKey: ['metrics-by-facility', params],
    queryFn: async () => (await metricsApi.byFacility(params)).data,
  })

  const { data: byPaySource } = useQuery<{ pay_source_name: string; total: number; accepted: number; declined: number; completed_revenue: number }[]>({
    queryKey: ['metrics-by-pay-source', params],
    queryFn: async () => (await metricsApi.byPaySource(params)).data,
  })

  const { data: quality } = useQuery<QualityMetrics>({
    queryKey: ['metrics-quality', params],
    queryFn: async () => (await metricsApi.quality(params)).data,
  })

  if (loadingSummary || loadingRevenue || loadingFacility) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-gray-200 border-t-brand-600" />
      </div>
    )
  }

  const pieData = summary
    ? [
        { name: 'Pending',   value: summary.pending,          color: STATE_COLORS.pending },
        { name: 'Accepted',  value: summary.accepted,         color: STATE_COLORS.accepted },
        { name: 'Declined',  value: summary.declined,         color: STATE_COLORS.declined },
        { name: 'Returned',  value: summary.returned,         color: STATE_COLORS.returned },
        { name: 'Completed', value: summary.completed,        color: STATE_COLORS.completed },
        { name: 'Canceled',  value: summary.canceled,         color: STATE_COLORS.canceled },
      ].filter((d) => d.value > 0)
    : []

  const hasFilters = dateFrom || dateTo || facilityId !== 'all'

  return (
    <div className="space-y-5">

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">From</span>
          <Input type="date" className="h-8 text-xs w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">To</span>
          <Input type="date" className="h-8 text-xs w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Select value={facilityId} onValueChange={setFacilityId}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="All Facilities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Facilities</SelectItem>
            {facilities.map((f) => <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setDateFrom(''); setDateTo(''); setFacilityId('all') }}>
            Clear
          </Button>
        )}
      </div>

      {/* Trip summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <StatCard label="Total"           value={summary.total} />
          <StatCard label="Pending"         value={summary.pending}          accent="text-amber-500" />
          <StatCard label="Accepted"        value={summary.accepted}         accent="text-green-600" />
          <StatCard label="Declined"        value={summary.declined}         accent="text-red-500" />
          <StatCard label="Completed"       value={summary.completed}        accent="text-purple-600" />
          <StatCard label="Canceled"        value={summary.canceled}         accent="text-gray-400" />
          <StatCard label="Returned"        value={summary.returned}         accent="text-blue-500" />
          <StatCard label="Arr / Canceled"  value={summary.arrived_canceled} accent="text-orange-500" />
        </div>
      )}

      {/* Revenue */}
      {revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RevenueCard label="Expected Revenue"    value={revenue.expected_total} />
          <RevenueCard label="Completed Revenue"   value={revenue.completed_revenue}    accent="text-green-600" />
          <RevenueCard label="Declined Opportunity" value={revenue.declined_opportunity} accent="text-red-500" />
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pieData.length > 0 && (
          <ChartCard title="Trips by State">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {byFacility && byFacility.length > 0 && (
          <ChartCard title="Trips by Facility">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byFacility} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="facility_name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="accepted" fill="#22c55e" name="Accepted" radius={[0, 3, 3, 0]} />
                <Bar dataKey="declined" fill="#ef4444" name="Declined" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Quality metrics */}
      {quality && (
        <>
          <div className="flex items-center gap-3 pt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">Quality Metrics</p>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Avg Turnaround"
              value={quality.avg_turnaround_hours < 1
                ? `${Math.round(quality.avg_turnaround_hours * 60)}m`
                : `${quality.avg_turnaround_hours}h`}
              sub="target ≤ 2 hrs"
              accent={quality.avg_turnaround_hours > 2 ? 'text-red-500' : quality.avg_turnaround_hours > 1 ? 'text-amber-500' : 'text-green-600'}
            />
            <StatCard
              label="Missing Info Rate"
              value={`${quality.missing_info_rate}%`}
              sub={`${quality.missing_info_count} trips flagged`}
              accent={quality.missing_info_rate > 20 ? 'text-red-500' : quality.missing_info_rate > 10 ? 'text-amber-500' : 'text-green-600'}
            />
            <StatCard
              label="Return Rate"
              value={`${quality.return_rate}%`}
              sub={`${quality.returned_count} returned`}
              accent={quality.return_rate > 15 ? 'text-red-500' : quality.return_rate > 8 ? 'text-amber-500' : 'text-green-600'}
            />
            <StatCard label="Decline Reasons"  value={quality.decline_reasons.length}       sub="distinct reasons" />
            <StatCard label="Cancel Reasons"   value={quality.cancellation_reasons.length}  sub="distinct reasons" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {quality.decline_reasons.length > 0 && (
              <ChartCard title="Top Decline Reasons">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={quality.decline_reasons} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ef4444" name="Count" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {byPaySource && byPaySource.length > 0 && (
              <ChartCard title="Trips by Pay Source">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={byPaySource} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="pay_source_name" width={130} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="accepted" fill="#22c55e" name="Accepted" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="declined" fill="#ef4444" name="Declined" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}

      {!quality && byPaySource && byPaySource.length > 0 && (
        <ChartCard title="Trips by Pay Source">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byPaySource} dataKey="total" nameKey="pay_source_name" cx="50%" cy="50%" outerRadius={90} label>
                {byPaySource.map((_, i) => <Cell key={i} fill={PAY_SOURCE_COLORS[i % PAY_SOURCE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
