import { useQuery } from '@tanstack/react-query'
import { metricsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { MetricsSummary, RevenueMetrics, QualityMetrics } from '@/lib/types'
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
  const { data: summary, isLoading: loadingSummary } = useQuery<MetricsSummary>({
    queryKey: ['metrics-summary'],
    queryFn: async () => (await metricsApi.summary()).data,
  })

  const { data: revenue, isLoading: loadingRevenue } = useQuery<RevenueMetrics>({
    queryKey: ['metrics-revenue'],
    queryFn: async () => (await metricsApi.revenue()).data,
  })

  const { data: byFacility, isLoading: loadingFacility } = useQuery<{ facility_name: string; total: number; accepted: number; declined: number }[]>({
    queryKey: ['metrics-by-facility'],
    queryFn: async () => (await metricsApi.byFacility()).data,
  })

  const { data: byPaySource } = useQuery<{ pay_source_name: string; total: number; accepted: number; declined: number; completed_revenue: number }[]>({
    queryKey: ['metrics-by-pay-source'],
    queryFn: async () => (await metricsApi.byPaySource()).data,
  })

  const { data: quality } = useQuery<QualityMetrics>({
    queryKey: ['metrics-quality'],
    queryFn: async () => (await metricsApi.quality()).data,
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

      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
