'use client';

import { useEffect, useState, useMemo } from 'react';
import { Thermometer, AlertTriangle, Snowflake, Activity, Loader2, Battery, Wifi } from 'lucide-react';

interface ColdChainEquipment {
  id: string;
  facilityId: string;
  facilityName: string;
  equipmentType: 'WALK_IN_COLD_ROOM' | 'SOLAR_REFRIGERATOR' | 'ICE_LINED_REFRIGERATOR' | 'FREEZER';
  serialNumber: string;
  model: string;
  location: string;
  currentTemperature: number;
  targetTemperature: {
    min: number;
    max: number;
  };
  status: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  lastMaintenance: string;
  batteryLevel: number | null;
  powerSource: 'GRID' | 'SOLAR' | 'GENERATOR' | 'BATTERY';
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  createdAt: string;
  updatedAt: string;
}

export default function ColdChainPage() {
  const [equipment, setEquipment] = useState<ColdChainEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'operational' | 'warning' | 'critical' | 'offline'>('all');

  // Fetch cold chain data
  useEffect(() => {
    const fetchColdChainData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/cold-chain');
        const json = await response.json();
        if (json.success) {
          setEquipment(json.data || []);
        } else {
          setError(json.error?.message || 'Failed to fetch cold chain data');
        }
      } catch (err) {
        setError('Network error: Failed to fetch cold chain data');
      } finally {
        setLoading(false);
      }
    };

    fetchColdChainData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchColdChainData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter equipment
  const filteredEquipment = useMemo(() => {
    if (filter === 'all') return equipment;
    return equipment.filter(e => {
      if (filter === 'operational') return e.status === 'OPERATIONAL';
      if (filter === 'warning') return e.status === 'WARNING';
      if (filter === 'critical') return e.status === 'CRITICAL';
      if (filter === 'offline') return e.status === 'OFFLINE';
      return true;
    });
  }, [equipment, filter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = equipment.length;
    const operational = equipment.filter(e => e.status === 'OPERATIONAL').length;
    const warning = equipment.filter(e => e.status === 'WARNING').length;
    const critical = equipment.filter(e => e.status === 'CRITICAL').length;
    return { total, operational, warning, critical };
  }, [equipment]);

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
          <h1 className="text-2xl font-bold text-white">Cold Chain Monitoring</h1>
          <p className="text-slate-400 mt-1">
            Real-time temperature monitoring for vaccine storage and transport
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
            <Activity className="w-4 h-4" />
            <span>View All Equipment</span>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-slate-400 text-sm">Total Equipment</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          <p className="text-slate-500 text-sm mt-1">Across all facilities</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-slate-400 text-sm">Operational</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.operational}</p>
          <p className="text-emerald-400 text-sm mt-1">{((stats.operational / stats.total) * 100).toFixed(1)}% compliance</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-slate-400 text-sm">Temperature Alerts</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.warning}</p>
          <p className="text-slate-500 text-sm mt-1">Requires attention</p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
          <p className="text-slate-400 text-sm">Critical Issues</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{stats.critical}</p>
          <p className="text-slate-500 text-sm mt-1">Immediate action needed</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'operational', 'warning', 'critical', 'offline'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Equipment List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Facility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Equipment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Temperature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Power</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">VVM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{eq.facilityName}</div>
                      <div className="text-xs text-slate-500">{eq.location}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{eq.model}</div>
                      <div className="text-xs text-slate-500">{eq.serialNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{eq.equipmentType.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{eq.currentTemperature}°C</div>
                      <div className="text-xs text-slate-500">Target: {eq.targetTemperature.min}-{eq.targetTemperature.max}°C</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        eq.status === 'OPERATIONAL' ? 'bg-emerald-500/20 text-emerald-400' :
                        eq.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                        eq.status === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wifi className={`w-4 h-4 ${
                          eq.powerSource === 'GRID' ? 'text-emerald-400' :
                          eq.powerSource === 'SOLAR' ? 'text-amber-400' :
                          'text-slate-500'
                        }`} />
                        <span className="text-sm text-slate-300">{eq.powerSource}</span>
                        {eq.batteryLevel !== null && (
                          <span className="text-xs text-slate-500">({eq.batteryLevel}%)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {eq.vvmStatus ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          eq.vvmStatus === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-400' :
                          eq.vvmStatus === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-rose-500/20 text-rose-400'
                        }`}>
                          {eq.vvmStatus}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No equipment data found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
