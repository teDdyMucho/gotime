import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { metricsApi, facilitiesApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { MetricsSummary, RevenueMetrics, QualityMetrics, Facility } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [facilityId, setFacilityId] = useState('all')

  const params: Record<string, string> = {}
  if (dateFrom)              params.date_from   = dateFrom
  if (dateTo)                params.date_to     = dateTo
  if (facilityId !== 'all')  params.facility_id = facilityId

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
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  const pieData = summary
    ? [
        { name: 'Pending', value: summary.pending, color: STATE_COLORS.pending },
        { name: 'Accepted', value: summary.accepted, color: STATE_COLORS.accepted },
        { name: 'Declined', value: summary.declined, color: STATE_COLORS.declined },
        { name: 'Returned', value: summary.returned, color: STATE_COLORS.returned },
        { name: 'Completed', value: summary.completed, color: STATE_COLORS.completed },
        { name: 'Canceled', value: summary.canceled, color: STATE_COLORS.canceled },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Select value={facilityId} onValueChange={setFacilityId}>
            <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="All Facilities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Facilities</SelectItem>
              {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {(dateFrom || dateTo || facilityId !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => { setDateFrom(''); setDateTo(''); setFacilityId('all') }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={summary.total} />
          <StatCard label="Pending" value={summary.pending} color="text-amber-600" />
          <StatCard label="Accepted" value={summary.accepted} color="text-green-600" />
          <StatCard label="Declined" value={summary.declined} color="text-red-600" />
          <StatCard label="Completed" value={summary.completed} color="text-purple-600" />
          <StatCard label="Canceled" value={summary.canceled} color="text-gray-500" />
          <StatCard label="Returned" value={summary.returned} color="text-blue-600" />
          <StatCard label="Arrived/Canceled" value={summary.arrived_canceled} color="text-orange-600" />
        </div>
      )}

      {/* Revenue cards */}
      {revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Expected Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenue.expected_total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Completed Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue.completed_revenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Declined Opportunity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(revenue.declined_opportunity)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trips by State</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byFacility && byFacility.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trips by Facility</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byFacility} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="facility_name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="accepted" fill="#22c55e" name="Accepted" />
                  <Bar dataKey="declined" fill="#ef4444" name="Declined" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quality metrics */}
      {quality && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <h2 className="text-lg font-semibold text-gray-800">Quality Metrics</h2>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Avg Turnaround"
              value={quality.avg_turnaround_hours < 1
                ? `${Math.round(quality.avg_turnaround_hours * 60)}m`
                : `${quality.avg_turnaround_hours}h`}
              sub="target ≤ 2 hrs"
              color={quality.avg_turnaround_hours > 2 ? 'text-red-600' : quality.avg_turnaround_hours > 1 ? 'text-amber-600' : 'text-green-600'}
            />
            <StatCard
              label="Missing Info Rate"
              value={`${quality.missing_info_rate}%`}
              sub={`${quality.missing_info_count} trips flagged`}
              color={quality.missing_info_rate > 20 ? 'text-red-600' : quality.missing_info_rate > 10 ? 'text-amber-600' : 'text-green-600'}
            />
            <StatCard
              label="Return Rate"
              value={`${quality.return_rate}%`}
              sub={`${quality.returned_count} returned`}
              color={quality.return_rate > 15 ? 'text-red-600' : quality.return_rate > 8 ? 'text-amber-600' : 'text-green-600'}
            />
            <StatCard
              label="Decline Reasons"
              value={quality.decline_reasons.length}
              sub="distinct reasons logged"
              color="text-gray-700"
            />
            <StatCard
              label="Cancel Reasons"
              value={quality.cancellation_reasons.length}
              sub="distinct reasons logged"
              color="text-gray-700"
            />
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {quality.decline_reasons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Decline Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={quality.decline_reasons} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" name="Count" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {byPaySource && byPaySource.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Trips by Pay Source</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byPaySource} layout="vertical" margin={{ left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="pay_source_name" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accepted" fill="#22c55e" name="Accepted" />
                      <Bar dataKey="declined" fill="#ef4444" name="Declined" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Pay source pie if no quality data */}
      {!quality && byPaySource && byPaySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trips by Pay Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byPaySource} dataKey="total" nameKey="pay_source_name" cx="50%" cy="50%" outerRadius={90} label>
                  {byPaySource.map((_, index) => (
                    <Cell key={index} fill={PAY_SOURCE_COLORS[index % PAY_SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
