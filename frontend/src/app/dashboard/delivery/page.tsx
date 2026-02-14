'use client';

import { useEffect, useState, useMemo } from 'react';
import { Truck, MapPin, Clock, CheckCircle, AlertTriangle, Package, Loader2, Filter } from 'lucide-react';

interface DeliveryData {
  id: string;
  transferId: string;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  vaccineName: string;
  quantity: number;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  estimatedDeliveryTime: string;
  actualDeliveryTime: string | null;
  deliveryPerson: string | null;
  temperature: number | null;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | null;
  createdAt: string;
  updatedAt: string;
}

export default function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch delivery data
  useEffect(() => {
    const fetchDeliveryData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/delivery');
        const json = await response.json();
        if (json.success) {
          setDeliveries(json.data || []);
        } else {
          setError(json.error?.message || 'Failed to fetch delivery data');
        }
      } catch (err) {
        setError('Network error: Failed to fetch delivery data');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchDeliveryData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    if (filter === 'all') return deliveries;
    const statusMap: Record<string, DeliveryData['status']> = {
      'active': 'IN_TRANSIT',
      'completed': 'DELIVERED',
      'failed': 'FAILED'
    };
    return deliveries.filter(d => d.status === statusMap[filter]);
  }, [deliveries, filter]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = deliveries.filter(d => d.status === 'IN_TRANSIT').length;
    const completed = deliveries.filter(d => d.status === 'DELIVERED').length;
    const failed = deliveries.filter(d => d.status === 'FAILED').length;
    return { active, completed, delayed: failed, total: deliveries.length };
  }, [deliveries]);

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Last-Mile Delivery</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Track vaccine deliveries from distribution centers to health facilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
            <Package className="w-4 h-4" />
            <span>New Delivery</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
          <input
            type="search"
            placeholder="Search deliveries, facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setFilter(filter === 'all' ? 'active' : filter === 'active' ? 'all' : 'active')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>{filter.charAt(0).toUpperCase() + filter.slice(1)}</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <p className="text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Active Deliveries</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.active}</p>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">In transit now</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Completed Today</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.completed}</p>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">Successfully delivered</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Delayed Deliveries</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.delayed}</p>
          <p className="text-slate-600 dark:text-slate-500 text-sm mt-1">Needs attention</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Total Deliveries</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{deliveries.length}</p>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">All time</p>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-200 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Facility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vaccine</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">ETA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{delivery.facilityName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-500">{delivery.state} • {delivery.lga}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 dark:text-slate-300">{delivery.vaccineName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-500">{delivery.transferId}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{delivery.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        delivery.status === 'PENDING' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                        delivery.status === 'IN_TRANSIT' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        delivery.status === 'DELIVERED' ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' :
                        delivery.status === 'FAILED' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                        'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                      }`}>
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 dark:text-slate-300">{new Date(delivery.estimatedDeliveryTime).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-emerald-600 dark:text-emerald-400 hover:underline text-sm">View Details</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600 dark:text-slate-500">
                    No delivery data found. Try adjusting your search or filters.
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
