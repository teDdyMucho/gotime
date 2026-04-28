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
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle,
  Clock, RotateCcw, Activity, DollarSign, Filter, X,
} from 'lucide-react'

const STATUS_CONFIG = {
  pending:          { color: '#f59e0b', bg: 'bg-amber-500',    light: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200' },
  accepted:         { color: '#16a34a', bg: 'bg-green-600',    light: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  declined:         { color: '#dc2626', bg: 'bg-red-600',      light: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  returned:         { color: '#2563eb', bg: 'bg-blue-600',     light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  canceled:         { color: '#6b7280', bg: 'bg-gray-500',     light: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-200' },
  completed:        { color: '#7c3aed', bg: 'bg-violet-600',   light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  arrived_canceled: { color: '#ea580c', bg: 'bg-orange-500',   light: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
}

const CHART_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#7c3aed', '#dc2626', '#06b6d4', '#ea580c']

function KpiCard({
  label, value, sub, icon: Icon, trend, trendLabel, accent = 'brand',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  accent?: string
}) {
  const accentMap: Record<string, { bar: string; icon: string; iconBg: string }> = {
    brand:  { bar: 'from-brand-500 to-brand-600',   icon: 'text-brand-600',   iconBg: 'bg-brand-50' },
    green:  { bar: 'from-green-500 to-green-600',   icon: 'text-green-600',   iconBg: 'bg-green-50' },
    amber:  { bar: 'from-amber-400 to-amber-500',   icon: 'text-amber-500',   iconBg: 'bg-amber-50' },
    red:    { bar: 'from-red-500 to-red-600',       icon: 'text-red-600',     iconBg: 'bg-red-50' },
    violet: { bar: 'from-violet-500 to-violet-600', icon: 'text-violet-600',  iconBg: 'bg-violet-50' },
    blue:   { bar: 'from-blue-500 to-blue-600',     icon: 'text-blue-600',    iconBg: 'bg-blue-50' },
  }
  const a = accentMap[accent] ?? accentMap.brand

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
      <div className={`h-1 w-full bg-gradient-to-r ${a.bar}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1.5 leading-none tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-1.5 leading-tight">{sub}</p>}
            {trendLabel && (
              <div className={`inline-flex items-center gap-1 mt-2 text-[11px] font-semibold ${
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                {trendLabel}
              </div>
            )}
          </div>
          <div className={`h-10 w-10 rounded-xl ${a.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${a.icon}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ label, value, total, config }: {
  label: string; value: number; total: number; config: typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${config.light} ${config.border}`}>
      <span className={`text-xs font-semibold ${config.text}`}>{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-base font-extrabold ${config.text}`}>{value}</span>
        <span className="text-[10px] text-gray-400 font-medium">{pct}%</span>
      </div>
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

function ChartCard({ title, sub, children, noPad }: { title: string; sub?: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={noPad ? '' : 'p-4'}>{children}</div>
    </div>
  )
}

const customTooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 12,
  padding: '8px 12px',
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

  const hasFilters = dateFrom || dateTo || facilityId !== 'all'
  const isLoading  = loadingSummary || loadingRevenue || loadingFacility

  const donutData = summary
    ? [
        { name: 'Pending',   value: summary.pending,          color: STATUS_CONFIG.pending.color },
        { name: 'Accepted',  value: summary.accepted,         color: STATUS_CONFIG.accepted.color },
        { name: 'Declined',  value: summary.declined,         color: STATUS_CONFIG.declined.color },
        { name: 'Returned',  value: summary.returned,         color: STATUS_CONFIG.returned.color },
        { name: 'Completed', value: summary.completed,        color: STATUS_CONFIG.completed.color },
        { name: 'Canceled',  value: summary.canceled,         color: STATUS_CONFIG.canceled.color },
      ].filter((d) => d.value > 0)
    : []

  const completionRate = summary && summary.total > 0
    ? Math.round((summary.completed / summary.total) * 100)
    : 0

  const acceptanceRate = summary && summary.total > 0
    ? Math.round((summary.accepted / summary.total) * 100)
    : 0

  return (
    <div className="flex flex-col gap-0 -m-6 min-h-full bg-gray-50">

      {/* ── Hero header bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Analytics</span>
            </div>
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Operations Dashboard</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Real-time transport dispatch analytics & KPIs</p>
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 h-8">
              <Filter className="h-3 w-3 text-gray-400 shrink-0" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-xs text-gray-700 outline-none w-28 cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 h-8">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-xs text-gray-700 outline-none w-28 cursor-pointer"
              />
            </div>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Facilities</SelectItem>
                {facilities.map((f) => <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setFacilityId('all') }}
                className="h-8 px-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-1.5 hover:bg-red-100 transition-colors"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-brand-600" />
            <p className="text-xs text-gray-400 font-medium">Loading analytics…</p>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">

          {/* ── Top KPI row ── */}
          {summary && revenue && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label="Total Trips"
                value={summary.total.toLocaleString()}
                sub="All time in range"
                icon={Activity}
                accent="brand"
              />
              <KpiCard
                label="Completion Rate"
                value={`${completionRate}%`}
                sub={`${summary.completed} completed`}
                icon={CheckCircle2}
                accent="violet"
                trend={completionRate >= 70 ? 'up' : 'down'}
                trendLabel={completionRate >= 70 ? 'On target' : 'Below target'}
              />
              <KpiCard
                label="Acceptance Rate"
                value={`${acceptanceRate}%`}
                sub={`${summary.accepted} accepted`}
                icon={TrendingUp}
                accent="green"
                trend={acceptanceRate >= 80 ? 'up' : 'down'}
                trendLabel={acceptanceRate >= 80 ? 'Healthy' : 'Needs review'}
              />
              <KpiCard
                label="Pending"
                value={summary.pending}
                sub="Awaiting action"
                icon={Clock}
                accent="amber"
              />
              <KpiCard
                label="Declined"
                value={summary.declined}
                sub={revenue.declined_opportunity > 0 ? `${formatCurrency(revenue.declined_opportunity)} lost` : undefined}
                icon={XCircle}
                accent="red"
              />
              <KpiCard
                label="Returned"
                value={summary.returned}
                sub="Needs re-dispatch"
                icon={RotateCcw}
                accent="blue"
              />
            </div>
          )}

          {/* ── Revenue row ── */}
          {revenue && (
            <>
              <SectionHeader title="Revenue Overview" sub="Financial performance across the selected period" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Expected Revenue</p>
                      <p className="text-3xl font-extrabold mt-1.5 tracking-tight">{formatCurrency(revenue.expected_total)}</p>
                      <p className="text-[11px] text-white/40 mt-1.5">Projected across all trips</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <DollarSign className="h-5 w-5 text-white/60" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Completed Revenue</p>
                      <p className="text-3xl font-extrabold mt-1.5 tracking-tight">{formatCurrency(revenue.completed_revenue)}</p>
                      <p className="text-[11px] text-white/60 mt-1.5">Realized from completed trips</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-5 text-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Declined Opportunity</p>
                      <p className="text-3xl font-extrabold mt-1.5 tracking-tight">{formatCurrency(revenue.declined_opportunity)}</p>
                      <p className="text-[11px] text-white/60 mt-1.5">Revenue lost to declines</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Charts row ── */}
          {(donutData.length > 0 || (byFacility && byFacility.length > 0)) && (
            <>
              <SectionHeader title="Trip Distribution" sub="Breakdown by status and facility" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Donut + status badges */}
                {donutData.length > 0 && summary && (
                  <ChartCard title="Trips by Status" sub="Visual breakdown of all trip states">
                    <div className="flex items-center gap-4">
                      <div className="shrink-0" style={{ width: 180, height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {donutData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} stroke="transparent" />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={customTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
                        <StatusBadge label="Pending"   value={summary.pending}   total={summary.total} config={STATUS_CONFIG.pending} />
                        <StatusBadge label="Accepted"  value={summary.accepted}  total={summary.total} config={STATUS_CONFIG.accepted} />
                        <StatusBadge label="Completed" value={summary.completed} total={summary.total} config={STATUS_CONFIG.completed} />
                        <StatusBadge label="Declined"  value={summary.declined}  total={summary.total} config={STATUS_CONFIG.declined} />
                        <StatusBadge label="Canceled"  value={summary.canceled}  total={summary.total} config={STATUS_CONFIG.canceled} />
                        <StatusBadge label="Returned"  value={summary.returned}  total={summary.total} config={STATUS_CONFIG.returned} />
                      </div>
                    </div>
                  </ChartCard>
                )}

                {/* Facility bar chart */}
                {byFacility && byFacility.length > 0 && (
                  <ChartCard title="Trips by Facility" sub="Accepted vs declined per facility">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={byFacility} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="facility_name" width={110} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={customTooltipStyle} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar dataKey="accepted" fill="#16a34a" name="Accepted" radius={[0, 4, 4, 0]} maxBarSize={14} />
                        <Bar dataKey="declined" fill="#dc2626" name="Declined" radius={[0, 4, 4, 0]} maxBarSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}
              </div>
            </>
          )}

          {/* ── Pay source chart ── */}
          {byPaySource && byPaySource.length > 0 && (
            <>
              <SectionHeader title="Pay Source Analysis" sub="Trip volume and revenue by billing source" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Volume by Pay Source" sub="Accepted & declined trips per payer">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byPaySource} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="pay_source_name" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="accepted" fill="#16a34a" name="Accepted" radius={[0, 4, 4, 0]} maxBarSize={14} />
                      <Bar dataKey="declined" fill="#dc2626" name="Declined" radius={[0, 4, 4, 0]} maxBarSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Revenue by Pay Source" sub="Completed revenue per payer">
                  <div className="space-y-2 py-1">
                    {[...byPaySource]
                      .sort((a, b) => b.completed_revenue - a.completed_revenue)
                      .map((ps, i) => {
                        const max = Math.max(...byPaySource.map((p) => p.completed_revenue), 1)
                        const pct = Math.round((ps.completed_revenue / max) * 100)
                        return (
                          <div key={ps.pay_source_name} className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-medium text-gray-700 truncate">{ps.pay_source_name}</span>
                                <span className="text-[11px] font-bold text-gray-900 ml-2 shrink-0">{formatCurrency(ps.completed_revenue)}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </ChartCard>
              </div>
            </>
          )}

          {/* ── Quality metrics ── */}
          {quality && (
            <>
              <SectionHeader title="Quality & Operations" sub="Service quality indicators and operational health" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Turnaround */}
                <div className={`rounded-2xl border p-5 ${
                  quality.avg_turnaround_hours > 2
                    ? 'bg-red-50 border-red-200'
                    : quality.avg_turnaround_hours > 1
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Avg Turnaround</p>
                      <p className={`text-3xl font-extrabold mt-1.5 tracking-tight ${
                        quality.avg_turnaround_hours > 2 ? 'text-red-600' : quality.avg_turnaround_hours > 1 ? 'text-amber-600' : 'text-green-700'
                      }`}>
                        {quality.avg_turnaround_hours < 1
                          ? `${Math.round(quality.avg_turnaround_hours * 60)}m`
                          : `${quality.avg_turnaround_hours}h`}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">Target: ≤ 2 hours</p>
                    </div>
                    <Clock className={`h-6 w-6 mt-1 shrink-0 ${
                      quality.avg_turnaround_hours > 2 ? 'text-red-500' : quality.avg_turnaround_hours > 1 ? 'text-amber-500' : 'text-green-600'
                    }`} />
                  </div>
                </div>

                {/* Missing info */}
                <div className={`rounded-2xl border p-5 ${
                  quality.missing_info_rate > 20 ? 'bg-red-50 border-red-200' : quality.missing_info_rate > 10 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Missing Info Rate</p>
                      <p className={`text-3xl font-extrabold mt-1.5 tracking-tight ${
                        quality.missing_info_rate > 20 ? 'text-red-600' : quality.missing_info_rate > 10 ? 'text-amber-600' : 'text-green-700'
                      }`}>
                        {quality.missing_info_rate}%
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">{quality.missing_info_count} trips flagged</p>
                    </div>
                    <AlertTriangle className={`h-6 w-6 mt-1 shrink-0 ${
                      quality.missing_info_rate > 20 ? 'text-red-500' : quality.missing_info_rate > 10 ? 'text-amber-500' : 'text-green-600'
                    }`} />
                  </div>
                </div>

                {/* Return rate */}
                <div className={`rounded-2xl border p-5 ${
                  quality.return_rate > 15 ? 'bg-red-50 border-red-200' : quality.return_rate > 8 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Return Rate</p>
                      <p className={`text-3xl font-extrabold mt-1.5 tracking-tight ${
                        quality.return_rate > 15 ? 'text-red-600' : quality.return_rate > 8 ? 'text-amber-600' : 'text-green-700'
                      }`}>
                        {quality.return_rate}%
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">{quality.returned_count} returned trips</p>
                    </div>
                    <RotateCcw className={`h-6 w-6 mt-1 shrink-0 ${
                      quality.return_rate > 15 ? 'text-red-500' : quality.return_rate > 8 ? 'text-amber-500' : 'text-green-600'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Decline & cancel reasons */}
              {(quality.decline_reasons.length > 0 || quality.cancellation_reasons.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {quality.decline_reasons.length > 0 && (
                    <ChartCard title="Top Decline Reasons" sub="Most common reasons trips are declined">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={quality.decline_reasons} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="reason" width={140} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={customTooltipStyle} />
                          <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                            {quality.decline_reasons.map((_, i) => (
                              <Cell key={i} fill="#dc2626" fillOpacity={1 - i * 0.12} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}

                  {quality.cancellation_reasons.length > 0 && (
                    <ChartCard title="Top Cancellation Reasons" sub="Most common reasons trips are canceled">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={quality.cancellation_reasons} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="reason" width={140} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={customTooltipStyle} />
                          <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} maxBarSize={14}>
                            {quality.cancellation_reasons.map((_, i) => (
                              <Cell key={i} fill="#6b7280" fillOpacity={1 - i * 0.12} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  )}
                </div>
              )}
            </>
          )}

        </div>
      )}
    </div>
  )
}
