'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { useMapContext } from '@/contexts/MapContext';
import { nigeriaStates } from '@/data/nigeria-geospatial';
import { LGAViewMap } from '@/components/map/LocationMap';
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
  const { selectLGA, selectedLGA, selectedState } = useMapContext();
  const [lgaData, setLGAData] = useState<LGAViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.isAuthenticated) {
      router.push('/login');
      return;
    }

    // Find and select the LGA in the map context
    for (const state of nigeriaStates) {
      const lga = state.lgas.find((l) => l.name.toLowerCase() === lgaName.replace(/-/g, ' ').toLowerCase());
      if (lga) {
        selectLGA(state.id, lga.id);
        break;
      }
    }

    // Fetch LGA data after LGA is selected
    if (selectedLGA) {
      fetchLGAData();
    }
  }, [lgaName, userSession, selectLGA, selectedLGA]);

  const fetchLGAData = async () => {
    setIsLoading(true);
    try {
      // Use the actual selected LGA from MapContext
      if (!selectedLGA || !selectedState) {
        console.error('No LGA or state selected');
        setIsLoading(false);
        return;
      }

      // Generate mock facilities for this LGA (in production, this would come from the API)
      const facilityTypes = [
        'Primary Health Center',
        'Dispensary',
        'Health Post',
        'MCH Center',
        'General Hospital',
        'Clinic',
      ];
      
      const stockStatuses = ['ADEQUATE', 'LOW', 'CRITICAL', 'OVERSTOCKED'];
      
      const numFacilities = Math.floor(Math.random() * 20) + 10; // Random 10-30 facilities
      const facilities = Array.from({ length: numFacilities }, (_, i) => {
        const type = facilityTypes[Math.floor(Math.random() * facilityTypes.length)];
        const stockStatus = stockStatuses[Math.floor(Math.random() * stockStatuses.length)];
        const hasColdChain = Math.random() > 0.3; // 70% have cold chain
        
        // Generate a random date within the last 30 days
        const lastDelivery = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        
        return {
          id: `fac-${i + 1}`,
          name: `${type} ${selectedLGA.name}`,
          code: `${type.substring(0, 3).toUpperCase()}-${selectedLGA.code}-${String(i + 1).padStart(3, '0')}`,
          type,
          stockStatus,
          hasColdChain,
          lastDelivery,
        };
      });

      // Calculate statistics
      const criticalStock = facilities.filter((f) => f.stockStatus === 'CRITICAL').length;
      const lowStock = facilities.filter((f) => f.stockStatus === 'LOW').length;
      const adequateStock = facilities.filter((f) => f.stockStatus === 'ADEQUATE').length;
      const overstocked = facilities.filter((f) => f.stockStatus === 'OVERSTOCKED').length;
      const stockCoverage = Math.round(((adequateStock + overstocked) / numFacilities) * 100);

      // Generate mock alerts for this LGA
      const alertTypes = [
        { type: 'STOCKOUT', severity: 'CRITICAL', message: 'OPV stock depleted - immediate replenishment required' },
        { type: 'EXPIRY', severity: 'HIGH', message: 'BCG batch expiring in 30 days' },
        { type: 'COLD_CHAIN', severity: 'MEDIUM', message: 'Refrigerator temperature fluctuation detected' },
        { type: 'LOW_STOCK', severity: 'HIGH', message: 'Pentavalent stock below 1 month supply' },
      ];

      const numAlerts = Math.floor(Math.random() * 5) + 1;
      const recentAlerts = Array.from({ length: numAlerts }, (_, i) => {
        const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const facility = facilities[Math.floor(Math.random() * facilities.length)];
        return {
          id: `alert-${i + 1}`,
          facilityName: facility.name,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        };
      });

      const lgaData: LGAViewData = {
        lga: selectedLGA.name,
        state: selectedState.name,
        zone: 'Nigeria', // In production, this would come from the state data
        totalFacilities: numFacilities,
        catchmentPopulation: Math.floor(Math.random() * 400000) + 100000, // Random 100k-500k
        stockCoverage,
        criticalStock,
        lowStock,
        adequateStock,
        overstocked,
        activeAlerts: numAlerts,
        facilities,
        recentAlerts,
      };
      
      setLGAData(lgaData);
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
              href="/dashboard"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">{lgaData.lga}</h1>
              <p className="text-xs text-slate-500">{lgaData.state} • {lgaData.zone} Zone • LGA View</p>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Building className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-slate-500">Facilities</span>
            </div>
            <div className="text-2xl font-bold text-white">{lgaData.totalFacilities}</div>
            <div className="text-xs text-slate-400 mt-1">Health facilities</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-5 h-5 text-violet-400" />
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
              <Package className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-slate-500">Adequate</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500">{lgaData.adequateStock}</div>
            <div className="text-xs text-slate-400 mt-1">Good stock levels</div>
          </div>

          <div className="bg-slate-900/50 border border-indigo-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-indigo-500" />
              <span className="text-xs text-slate-500">Overstocked</span>
            </div>
            <div className="text-2xl font-bold text-indigo-500">{lgaData.overstocked}</div>
            <div className="text-xs text-slate-400 mt-1">Excess stock</div>
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
                  Click on a facility to view detailed information
                </p>
              </div>
              <LGAViewMap height="500px" className="w-full" />
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Recent Alerts
            </h2>
            <div className="space-y-3">
              {lgaData.recentAlerts.map((alert) => (
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

        {/* Facilities Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-cyan-400" />
            Health Facilities
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Facility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Stock Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cold Chain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Delivery</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {lgaData.facilities.map((facility) => (
                  <tr key={facility.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-white">{facility.name}</div>
                        <div className="text-xs text-slate-500">{facility.code}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{facility.type}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStockStatusColor(
                          facility.stockStatus
                        )}`}
                      >
                        {facility.stockStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {facility.hasColdChain ? (
                        <Thermometer className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Thermometer className="w-4 h-4 text-slate-600" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{facility.lastDelivery}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/facility/${facility.id}`}
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
