'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, PieChart, Download, Loader2, AlertTriangle } from 'lucide-react';

interface CoverageData {
  state: string;
  lga: string;
  targetPopulation: number;
  vaccinatedPopulation: number;
  coverageRate: number;
  vaccineType: string;
  period: string;
}

interface PerformanceMetrics {
  category: string;
  metric: string;
  value: number;
  target: number;
  variance: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  period: string;
}

interface TrendData {
  date: string;
  metric: string;
  value: number;
  category: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<{
    coverage: CoverageData[];
    performance: PerformanceMetrics[];
    trends: TrendData[];
  }>({
    coverage: [],
    performance: [],
    trends: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [category, setCategory] = useState<'coverage' | 'performance' | 'trends' | 'all'>('all');

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/analytics?period=${period}&category=${category}`);
        const json = await response.json();
        if (json.success) {
          setAnalytics(json.data);
        } else {
          setError(json.error?.message || 'Failed to fetch analytics data');
        }
      } catch (err) {
        setError('Network error: Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period, category]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const avgCoverage = analytics.coverage.length > 0
      ? analytics.coverage.reduce((sum, c) => sum + c.coverageRate, 0) / analytics.coverage.length
      : 0;
    
    const avgPerformance = analytics.performance.length > 0
      ? analytics.performance.reduce((sum, p) => sum + (p.value / p.target) * 100, 0) / analytics.performance.length
      : 0;

    return {
      coverage: avgCoverage,
      performance: avgPerformance,
    };
  }, [analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
          <p className="text-slate-400 mt-1">
            Comprehensive data insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <p className="text-rose-400">{error}</p>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        {(['7d', '30d', '90d', '1y'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setPeriod(range as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === range
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Category Selector */}
      <div className="flex items-center gap-2">
        {(['all', 'coverage', 'performance', 'trends'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as any)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Coverage Rate</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.coverage.toFixed(1)}%</p>
          <p className="text-emerald-400 text-sm mt-1">National average</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Performance</p>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{kpis.performance.toFixed(1)}%</p>
          <p className="text-emerald-400 text-sm mt-1">Target achievement</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Data Points</p>
            <PieChart className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{analytics.coverage.length + analytics.performance.length + analytics.trends.length}</p>
          <p className="text-slate-500 text-sm mt-1">Total records</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Period</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{period.toUpperCase()}</p>
          <p className="text-slate-500 text-sm mt-1">Selected time range</p>
        </div>
      </div>

      {/* Data Tables */}
      {(category === 'all' || category === 'coverage') && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">Vaccine Coverage by State</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Target Population</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Vaccinated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Coverage Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Vaccine Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {analytics.coverage.length > 0 ? (
                  analytics.coverage.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{item.state}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.targetPopulation.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.vaccinatedPopulation.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.coverageRate >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                          item.coverageRate >= 60 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.coverageRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.vaccineType}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No coverage data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(category === 'all' || category === 'performance') && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Variance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {analytics.performance.length > 0 ? (
                  analytics.performance.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white">{item.category}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.metric}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.value.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.target.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.variance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.variance > 0 ? '+' : ''}{item.variance.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.trend === 'UP' ? 'bg-emerald-500/20 text-emerald-400' :
                          item.trend === 'DOWN' ? 'bg-rose-500/20 text-rose-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {item.trend}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No performance data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(category === 'all' || category === 'trends') && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-lg font-semibold text-white">Trend Analysis</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {analytics.trends.length > 0 ? (
                  analytics.trends.slice(0, 20).map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-300">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.metric}</td>
                      <td className="px-4 py-3 text-sm text-white">{item.value.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{item.category}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No trend data available for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
