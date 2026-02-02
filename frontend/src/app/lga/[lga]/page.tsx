'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import {
  ArrowLeft,
  MapPin,
  Package,
  AlertTriangle,
  Activity,
  Building,
  Thermometer,
} from 'lucide-react';
import { getStockStatusColor, getVVMStageColor } from '@/lib/utils';

interface LGAViewData {
  lga: string;
  state: string;
  zone: string;
  totalFacilities: number;
  catchmentPopulation: number;
  stockCoverage: number;
  criticalStock: number;
  lowStock: number;
  adequateStock: number;
  overstocked: number;
  activeAlerts: number;
  facilities: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    stockStatus: string;
    hasColdChain: boolean;
    lastDelivery: string;
  }>;
  recentAlerts: Array<{
    id: string;
    facilityName: string;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
}

export default function LGAViewPage() {
  const params = useParams();
  const router = useRouter();
  const lgaName = params.lga as string;
  const { userSession } = useVaxTraceStore();
  const [lgaData, setLGAData] = useState<LGAViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchLGAData();
  }, [lgaName, userSession]);

  const fetchLGAData = async () => {
    setIsLoading(true);
    try {
      // In production, this would fetch from the API
      // For now, using mock data
      const mockLGAData: LGAViewData = {
        lga: lgaName.replace(/-/g, ' '),
        state: 'Kano',
        zone: 'North West',
        totalFacilities: 35,
        catchmentPopulation: 450000,
        stockCoverage: 85.2,
        criticalStock: 2,
        lowStock: 5,
        adequateStock: 22,
        overstocked: 6,
        activeAlerts: 8,
        facilities: [
          {
            id: 'fac-1',
            name: 'Primary Health Center Kano Municipal',
            code: 'PHC-KANO-001',
            type: 'Primary Health Center',
            stockStatus: 'ADEQUATE',
            hasColdChain: true,
            lastDelivery: '2025-01-25',
          },
          {
            id: 'fac-2',
            name: 'Dispensary Fagge',
            code: 'DISP-FAGGE-001',
            type: 'Dispensary',
            stockStatus: 'LOW',
            hasColdChain: true,
            lastDelivery: '2025-01-20',
          },
          {
            id: 'fac-3',
            name: 'Health Post Dala',
            code: 'HP-DALA-001',
            type: 'Health Post',
            stockStatus: 'CRITICAL',
            hasColdChain: false,
            lastDelivery: '2025-01-10',
          },
          {
            id: 'fac-4',
            name: 'Maternal & Child Health Center Gwale',
            code: 'MCH-GWALE-001',
            type: 'MCH Center',
            stockStatus: 'ADEQUATE',
            hasColdChain: true,
            lastDelivery: '2025-01-22',
          },
          {
            id: 'fac-5',
            name: 'Primary Health Center Dawakin Kudu',
            code: 'PHC-DAKIN-001',
            type: 'Primary Health Center',
            stockStatus: 'OVERSTOCKED',
            hasColdChain: true,
            lastDelivery: '2025-01-18',
          },
          {
            id: 'fac-6',
            name: 'Dispensary Tudun Wada',
            code: 'DISP-TUDUN-001',
            type: 'Dispensary',
            stockStatus: 'ADEQUATE',
            hasColdChain: true,
            lastDelivery: '2025-01-24',
          },
          {
            id: 'fac-7',
            name: 'Health Post Madobi',
            code: 'HP-MADOBI-001',
            type: 'Health Post',
            stockStatus: 'ADEQUATE',
            hasColdChain: false,
            lastDelivery: '2025-01-15',
          },
          {
            id: 'fac-8',
            name: 'Primary Health Center Kumbotso',
            code: 'PHC-KUMB-001',
            type: 'Primary Health Center',
            stockStatus: 'LOW',
            hasColdChain: true,
            lastDelivery: '2025-01-12',
          },
        ],
        recentAlerts: [
          {
            id: 'alert-1',
            facilityName: 'Health Post Dala',
            type: 'STOCKOUT',
            severity: 'CRITICAL',
            message: 'OPV stock depleted - immediate replenishment required',
            createdAt: '2025-01-30T10:30:00Z',
          },
          {
            id: 'alert-2',
            facilityName: 'Dispensary Fagge',
            type: 'EXPIRY',
            severity: 'HIGH',
            message: 'BCG batch expiring in 30 days',
            createdAt: '2025-01-29T14:20:00Z',
          },
          {
            id: 'alert-3',
            facilityName: 'Primary Health Center Kano Municipal',
            type: 'COLD_CHAIN',
            severity: 'MEDIUM',
            message: 'Refrigerator temperature fluctuation detected',
            createdAt: '2025-01-28T09:45:00Z',
          },
        ],
      };
      setLGAData(mockLGAData);
    } catch (error) {
      console.error('Error fetching LGA data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading LGA data...</p>
        </div>
      </div>
    );
  }

  if (!lgaData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">LGA Not Found</h1>
          <Link href="/dashboard" className="text-emerald-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/state/${lgaData.state.toLowerCase().replace(/ /g, '-')}`}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">{lgaData.lga}</h1>
              <p className="text-xs text-slate-500">
                {lgaData.state} • {lgaData.zone} Zone
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-4 h-4" />
            {lgaData.totalFacilities} Facilities
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Building className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-slate-500">Facilities</span>
            </div>
            <div className="text-2xl font-bold text-white">{lgaData.totalFacilities}</div>
            <div className="text-xs text-slate-400 mt-1">In LGA</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-violet-400" />
              <span className="text-xs text-slate-500">Population</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {(lgaData.catchmentPopulation / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-slate-400 mt-1">Catchment area</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Critical</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{lgaData.criticalStock}</div>
            <div className="text-xs text-slate-400 mt-1">Stockout risk</div>
          </div>

          <div className="bg-slate-900/50 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-slate-500">Low Stock</span>
            </div>
            <div className="text-2xl font-bold text-amber-500">{lgaData.lowStock}</div>
            <div className="text-xs text-slate-400 mt-1">{'<'} 3 months</div>
          </div>

          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-slate-500">Coverage</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500">{lgaData.stockCoverage}%</div>
            <div className="text-xs text-slate-400 mt-1">Stock coverage</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Alerts</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{lgaData.activeAlerts}</div>
            <div className="text-xs text-slate-400 mt-1">Active alerts</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Facilities Table */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-cyan-400" />
              Facilities
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Facility</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cold Chain</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {lgaData.facilities.map((facility) => (
                    <tr key={facility.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-white">{facility.name}</p>
                          <p className="text-xs text-slate-500">{facility.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">{facility.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded border ${getStockStatusColor(facility.stockStatus)}`}
                        >
                          {facility.stockStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {facility.hasColdChain ? (
                          <Thermometer className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Thermometer className="w-4 h-4 text-slate-600" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/facility/${facility.id}`}
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Recent Alerts
            </h2>
            <div className="space-y-3">
              {lgaData.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-3 hover:bg-slate-800/30 transition-colors cursor-pointer ${
                    alert.severity === 'CRITICAL'
                      ? 'border-rose-500/30'
                      : alert.severity === 'HIGH'
                      ? 'border-amber-500/30'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">{alert.facilityName}</p>
                      <p className="text-xs text-slate-500">{alert.type}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400'
                          : alert.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Distribution */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Stock Distribution
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-rose-500">{lgaData.criticalStock}</p>
              <p className="text-sm text-slate-400 mt-1">Critical</p>
              <p className="text-xs text-slate-500 mt-1">
                {((lgaData.criticalStock / lgaData.totalFacilities) * 100).toFixed(1)}% of facilities
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-500">{lgaData.lowStock}</p>
              <p className="text-sm text-slate-400 mt-1">Low Stock</p>
              <p className="text-xs text-slate-500 mt-1">
                {((lgaData.lowStock / lgaData.totalFacilities) * 100).toFixed(1)}% of facilities
              </p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-emerald-500">{lgaData.adequateStock}</p>
              <p className="text-sm text-slate-400 mt-1">Adequate</p>
              <p className="text-xs text-slate-500 mt-1">
                {((lgaData.adequateStock / lgaData.totalFacilities) * 100).toFixed(1)}% of facilities
              </p>
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-cyan-500">{lgaData.overstocked}</p>
              <p className="text-sm text-slate-400 mt-1">Overstocked</p>
              <p className="text-xs text-slate-500 mt-1">
                {((lgaData.overstocked / lgaData.totalFacilities) * 100).toFixed(1)}% of facilities
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
