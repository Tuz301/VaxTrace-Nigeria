'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { NationalViewMap } from '@/components/map';
import { MapErrorBoundary } from '@/components/map/MapErrorBoundary';
import { AlertTicker } from '@/components/dashboard/AlertTicker';
import { useMapContext } from '@/contexts/MapContext';
import { Wifi, WifiOff, AlertTriangle, Activity, TrendingUp, Package, Clock, MapPin, Filter } from 'lucide-react';

// Nigeria states data
const NIGERIA_STATES = [
  { id: 'abia', name: 'Abia', capital: 'Umuahia' },
  { id: 'adamawa', name: 'Adamawa', capital: 'Yola' },
  { id: 'akwa-ibom', name: 'Akwa Ibom', capital: 'Uyo' },
  { id: 'anambra', name: 'Anambra', capital: 'Awka' },
  { id: 'bauchi', name: 'Bauchi', capital: 'Bauchi' },
  { id: 'bayelsa', name: 'Bayelsa', capital: 'Yenagoa' },
  { id: 'benue', name: 'Benue', capital: 'Makurdi' },
  { id: 'borno', name: 'Borno', capital: 'Maiduguri' },
  { id: 'cross-river', name: 'Cross River', capital: 'Calabar' },
  { id: 'delta', name: 'Delta', capital: 'Asaba' },
  { id: 'ebonyi', name: 'Ebonyi', capital: 'Abakaliki' },
  { id: 'edo', name: 'Edo', capital: 'Benin City' },
  { id: 'ekiti', name: 'Ekiti', capital: 'Ado-Ekiti' },
  { id: 'enugu', name: 'Enugu', capital: 'Enugu' },
  { id: 'fct', name: 'Federal Capital Territory', capital: 'Abuja' },
  { id: 'gombe', name: 'Gombe', capital: 'Gombe' },
  { id: 'imo', name: 'Imo', capital: 'Owerri' },
  { id: 'jigawa', name: 'Jigawa', capital: 'Dutse' },
  { id: 'kaduna', name: 'Kaduna', capital: 'Kaduna' },
  { id: 'kano', name: 'Kano', capital: 'Kano' },
  { id: 'katsina', name: 'Katsina', capital: 'Katsina' },
  { id: 'kebbi', name: 'Kebbi', capital: 'Birnin Kebbi' },
  { id: 'kogi', name: 'Kogi', capital: 'Lokoja' },
  { id: 'kwara', name: 'Kwara', capital: 'Ilorin' },
  { id: 'lagos', name: 'Lagos', capital: 'Ikeja' },
  { id: 'nasarawa', name: 'Nasarawa', capital: 'Lafia' },
  { id: 'niger', name: 'Niger', capital: 'Minna' },
  { id: 'ogun', name: 'Ogun', capital: 'Abeokuta' },
  { id: 'ondo', name: 'Ondo', capital: 'Akure' },
  { id: 'osun', name: 'Osun', capital: 'Osogbo' },
  { id: 'oyo', name: 'Oyo', capital: 'Ibadan' },
  { id: 'plateau', name: 'Plateau', capital: 'Jos' },
  { id: 'rivers', name: 'Rivers', capital: 'Port Harcourt' },
  { id: 'sokoto', name: 'Sokoto', capital: 'Sokoto' },
  { id: 'taraba', name: 'Taraba', capital: 'Jalingo' },
  { id: 'yobe', name: 'Yobe', capital: 'Damaturu' },
  { id: 'zamfara', name: 'Zamfara', capital: 'Gusau' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [selectedState, setSelectedState] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    stockData,
    alerts,
    predictiveInsights,
    transferSuggestions,
    offlineStatus,
    userSession,
    fetchStockData,
    fetchAlerts,
    fetchPredictiveInsights,
    fetchTransferSuggestions,
  } = useVaxTraceStore();

  const { clearSelection } = useMapContext();

  useEffect(() => {
    // Fetch initial data
    fetchStockData();
    fetchAlerts();
    fetchPredictiveInsights();
    fetchTransferSuggestions();

    // Clear any previous map selection when loading dashboard
    clearSelection();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      if (!offlineStatus.isOffline) {
        fetchStockData();
        fetchAlerts();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [offlineStatus.isOffline, clearSelection]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalFacilities = stockData.length;
    const criticalStock = stockData.filter((s) => s.stockStatus === 'STOCKOUT').length;
    const lowStock = stockData.filter((s) => s.stockStatus === 'UNDERSTOCKED').length;
    const adequateStock = stockData.filter((s) => s.stockStatus === 'OPTIMAL').length;
    const overstocked = stockData.filter((s) => s.stockStatus === 'OVERSTOCKED').length;
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL').length;

    return {
      totalFacilities,
      criticalStock,
      lowStock,
      adequateStock,
      overstocked,
      totalAlerts,
      criticalAlerts,
      stockCoverage: totalFacilities > 0 ? ((adequateStock + overstocked) / totalFacilities) * 100 : 0,
    };
  }, [stockData, alerts]);

  // High-risk predictions (Crystal Ball)
  const highRiskPredictions = useMemo(
    () => predictiveInsights.filter((p) => p.riskLevel === 'HIGH').slice(0, 5),
    [predictiveInsights]
  );

  // Top transfer suggestions
  const topTransferSuggestions = useMemo(() => transferSuggestions.slice(0, 5), [transferSuggestions]);

  if (!userSession?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">VaxTrace Nigeria</h1>
          <p className="text-slate-400 mb-6">Please authenticate to access the dashboard</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Offline Status Banner */}
      {offlineStatus.isOffline && (
        <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-2 flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-amber-500 text-sm font-medium">
            Offline Mode - Showing cached data. Last sync: {new Date(offlineStatus.lastSync).toLocaleString()}
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                VaxTrace Nigeria
              </h1>
              <span className="text-xs text-slate-500">National Command Center</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                {offlineStatus.isOffline ? (
                  <>
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span>Offline</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    <span>Connected</span>
                  </>
                )}
              </div>
              <div className="text-sm text-slate-400">
                {userSession.user?.name} ({userSession.user?.role})
              </div>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
              >
                Logout
              </Link>
            </div>
          </div>
          
          {/* State/LGA Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            
            {showFilters && (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm text-slate-400 whitespace-nowrap">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    State:
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      const stateId = e.target.value;
                      setSelectedState(stateId);
                      if (stateId) {
                        router.push(`/state/${stateId}`);
                      }
                    }}
                    className="flex-1 max-w-xs px-3 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">All States (National View)</option>
                    {NIGERIA_STATES.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="text-xs text-slate-500">
                  {selectedState
                    ? `Showing data for ${NIGERIA_STATES.find(s => s.id === selectedState)?.name}`
                    : 'Showing national data - select a state to drill down'}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Alert Ticker */}
      <AlertTicker />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-slate-500">Facilities</span>
            </div>
            <div className="text-2xl font-bold text-white">{kpis.totalFacilities}</div>
            <div className="text-xs text-slate-400 mt-1">Tracked nationwide</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Critical</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{kpis.criticalStock}</div>
            <div className="text-xs text-slate-400 mt-1">Stockout risk</div>
          </div>

          <div className="bg-slate-900/50 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-xs text-slate-500">Low Stock</span>
            </div>
            <div className="text-2xl font-bold text-amber-500">{kpis.lowStock}</div>
            <div className="text-xs text-slate-400 mt-1">{'<'} 3 months supply</div>
          </div>

          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-emerald-500" />
              <span className="text-xs text-slate-500">Adequate</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500">{kpis.adequateStock}</div>
            <div className="text-xs text-slate-400 mt-1">Optimal levels</div>
          </div>

          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-cyan-500" />
              <span className="text-xs text-slate-500">Overstocked</span>
            </div>
            <div className="text-2xl font-bold text-cyan-500">{kpis.overstocked}</div>
            <div className="text-xs text-slate-400 mt-1">Excess inventory</div>
          </div>

          <div className="bg-slate-900/50 border border-violet-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <span className="text-xs text-slate-500">Coverage</span>
            </div>
            <div className="text-2xl font-bold text-violet-500">{kpis.stockCoverage.toFixed(1)}%</div>
            <div className="text-xs text-slate-400 mt-1">National average</div>
          </div>

          <div className="bg-slate-900/50 border border-rose-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-xs text-slate-500">Active Alerts</span>
            </div>
            <div className="text-2xl font-bold text-rose-500">{kpis.totalAlerts}</div>
            <div className="text-xs text-slate-400 mt-1">{kpis.criticalAlerts} critical</div>
          </div>
        </div>

        {/* Neural Map and Side Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
          {/* Crystal Ball - Predictive Insights */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Crystal Ball - Predictions
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {highRiskPredictions.length > 0 ? (
                highRiskPredictions.map((prediction) => (
                  <div
                    key={prediction.id}
                    className="bg-slate-800/50 border border-rose-500/30 rounded p-3 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-white">{prediction.facilityName}</span>
                      <span className="text-xs px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded">
                        {prediction.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{prediction.prediction}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Expected: {new Date(prediction.expectedDate).toLocaleDateString()}
                      </span>
                      <span className="text-rose-400">{prediction.confidence}% confidence</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 text-sm py-8">No high-risk predictions</div>
              )}
            </div>
          </div>

          {/* Leaflet Map */}
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
            <MapErrorBoundary>
              <NationalViewMap height="100%" />
            </MapErrorBoundary>
          </div>

          {/* Transfer Suggestions */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Transfer Suggestions
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2">
              {topTransferSuggestions.length > 0 ? (
                topTransferSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-slate-800/50 border border-cyan-500/30 rounded p-3 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-cyan-400">
                        {suggestion.fromFacilityName} → {suggestion.toFacilityName}
                      </span>
                      <span className="text-xs text-emerald-400">{suggestion.confidence}%</span>
                    </div>
                    <p className="text-xs text-white mb-1">{suggestion.productName}</p>
                    <p className="text-xs text-slate-400">
                      Transfer {suggestion.suggestedQuantity} doses ({suggestion.distance}km)
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-500 text-sm py-8">No transfer suggestions</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
