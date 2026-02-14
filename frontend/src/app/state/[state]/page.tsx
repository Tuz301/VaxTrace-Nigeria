'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { useMapContext } from '@/contexts/MapContext';
import { nigeriaStates } from '@/data/nigeria-geospatial';
import { StateViewMap } from '@/components/map/LocationMap';
import {
  ArrowLeft,
  MapPin,
  Package,
  AlertTriangle,
  Activity,
  TrendingUp,
  Users,
  Building,
} from 'lucide-react';
import { getStockStatusColor } from '@/lib/utils';

interface StateViewData {
  state: string;
  zone: string;
  totalFacilities: number;
  totalLgas: number;
  catchmentPopulation: number;
  stockCoverage: number;
  criticalStock: number;
  lowStock: number;
  adequateStock: number;
  overstocked: number;
  activeAlerts: number;
  lgas: Array<{
    name: string;
    facilities: number;
    criticalStock: number;
    stockCoverage: number;
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

export default function StateViewPage() {
  const params = useParams();
  const router = useRouter();
  const stateName = params.state as string;
  const { userSession } = useVaxTraceStore();
  const { selectState, selectedState } = useMapContext();
  const [stateData, setStateData] = useState<StateViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.isAuthenticated) {
      router.push('/login');
      return;
    }

    // Find and select the state in the map context
    const state = nigeriaStates.find((s) => s.name.toLowerCase() === stateName.replace(/-/g, ' ').toLowerCase());
    if (state) {
      selectState(state.id);
    }

    // Fetch state data after state is selected
    if (selectedState) {
      fetchStateData();
    }
  }, [stateName, userSession, selectState, selectedState]);

  const fetchStateData = async () => {
    setIsLoading(true);
    try {
      // Use the actual selected state from MapContext
      if (!selectedState) {
        console.error('No state selected');
        setIsLoading(false);
        return;
      }

      // Generate dynamic data based on the actual state's LGAs
      const stateLGAs = selectedState.lgas;
      const totalLgas = stateLGAs.length;
      
      // Generate mock data for each LGA (in production, this would come from the API)
      const lgaData = stateLGAs.map((lga) => ({
        name: lga.name,
        facilities: Math.floor(Math.random() * 30) + 10, // Random facilities between 10-40
        criticalStock: Math.floor(Math.random() * 5), // Random critical stock 0-4
        stockCoverage: Math.floor(Math.random() * 30) + 65, // Random coverage 65-95%
      }));

      // Calculate totals
      const totalFacilities = lgaData.reduce((sum, lga) => sum + lga.facilities, 0);
      const criticalStock = lgaData.reduce((sum, lga) => sum + lga.criticalStock, 0);
      const avgStockCoverage = Math.round(
        lgaData.reduce((sum, lga) => sum + lga.stockCoverage, 0) / totalLgas
      );
      const lowStock = lgaData.filter((lga) => lga.stockCoverage < 80 && lga.stockCoverage >= 60).length;
      const adequateStock = lgaData.filter((lga) => lga.stockCoverage >= 80).length;
      const overstocked = lgaData.filter((lga) => lga.stockCoverage > 95).length;

      // Generate mock alerts for the state
      const recentAlerts = [
        {
          id: 'alert-1',
          facilityName: `PHC ${stateLGAs[0]?.name || 'Main'}`,
          type: 'STOCKOUT',
          severity: 'CRITICAL',
          message: 'Pentavalent stock below 1 month supply',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'alert-2',
          facilityName: `Dispensary ${stateLGAs[1]?.name || 'Central'}`,
          type: 'COLD_CHAIN',
          severity: 'HIGH',
          message: 'Refrigerator temperature above safe range',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'alert-3',
          facilityName: `Health Post ${stateLGAs[2]?.name || 'North'}`,
          type: 'EXPIRY',
          severity: 'MEDIUM',
          message: 'OPV batch expiring in 45 days',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];

      const stateData: StateViewData = {
        state: selectedState.name,
        zone: 'Nigeria', // In production, this would come from the state data
        totalFacilities,
        totalLgas,
        catchmentPopulation: Math.floor(Math.random() * 10000000) + 2000000, // Random population
        stockCoverage: avgStockCoverage,
        criticalStock,
        lowStock,
        adequateStock,
        overstocked,
        activeAlerts: recentAlerts.length,
        lgas: lgaData,
        recentAlerts,
      };
      
      setStateData(stateData);
    } catch (error) {
      console.error('Error fetching state data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading state data...</p>
        </div>
      </div>
    );
  }

  if (!stateData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">State Not Found</h1>
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
              href="/dashboard"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">{stateData.state}</h1>
              <p className="text-xs text-slate-500">{stateData.zone} Zone • State View</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-4 h-4" />
            {stateData.totalLgas} LGAs
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
            <div className="text-2xl font-bold text-white">{stateData.totalFacilities}</div>
            <div className="text-xs text-slate-400 mt-1">Across {stateData.totalLgas} LGAs</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-violet-400" />
              <span className="text-xs text-slate-500">Population</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {(stateData.catchmentPopulation / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-slate-400 mt-1">Catchment area</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Critical</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{stateData.criticalStock}</div>
            <div className="text-xs text-slate-400 mt-1">Stockout risk</div>
          </div>

          <div className="bg-slate-900/50 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-slate-500">Low Stock</span>
            </div>
            <div className="text-2xl font-bold text-amber-500">{stateData.lowStock}</div>
            <div className="text-xs text-slate-400 mt-1">{'<'} 3 months</div>
          </div>

          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-slate-500">Coverage</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500">{stateData.stockCoverage}%</div>
            <div className="text-xs text-slate-400 mt-1">Stock coverage</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Alerts</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{stateData.activeAlerts}</div>
            <div className="text-xs text-slate-400 mt-1">Active alerts</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map - Takes up 2 columns on large screens */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  Geographical View
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Click on an LGA to view detailed information
                </p>
              </div>
              <StateViewMap height="500px" className="w-full" />
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Recent Alerts
            </h2>
            <div className="space-y-3">
              {stateData.recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{alert.facilityName}</p>
                      <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : alert.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{alert.type}</span>
                    <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LGAs Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Local Government Areas
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">LGA</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Facilities</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Critical</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Coverage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {stateData.lgas.map((lga) => (
                  <tr key={lga.name} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{lga.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{lga.facilities}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`text-sm font-medium ${
                          lga.criticalStock > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {lga.criticalStock}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              lga.stockCoverage >= 80
                                ? 'bg-emerald-500'
                                : lga.stockCoverage >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${lga.stockCoverage}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-300">{lga.stockCoverage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/lga/${lga.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
