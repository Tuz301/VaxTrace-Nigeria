'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, Search, Filter, Loader2, AlertTriangle } from 'lucide-react';

interface StockItem {
  nodeId: string;
  facilityName: string;
  facilityCode: string;
  state: string;
  lga: string;
  productCode: string;
  productName: string;
  quantity: number;
  lotCode: string;
  lotExpiry: string;
  expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED';
  vvmStage: number;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  monthsOfStock: number;
  stockStatus: 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED';
  lastUpdated: string;
}

export default function InventoryPage() {
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch stock data
  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/stock');
        const json = await response.json();
        if (json.success) {
          setStockData(json.data || []);
        } else {
          setError(json.error?.message || 'Failed to fetch stock data');
        }
      } catch (err) {
        setError('Network error: Failed to fetch stock data');
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStockData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter stock data based on search
  const filteredStockData = useMemo(() => {
    if (!searchQuery) return stockData;
    return stockData.filter(item =>
      item.facilityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lotCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stockData, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVaccines = stockData.reduce((sum, item) => sum + item.quantity, 0);
    const lowStock = stockData.filter(s => s.stockStatus === 'UNDERSTOCKED').length;
    const stockouts = stockData.filter(s => s.stockStatus === 'STOCKOUT').length;
    const expiringSoon = stockData.filter(s => s.expiryRisk === 'HIGH' || s.expiryRisk === 'EXPIRED').length;
    return { totalVaccines, lowStock, stockouts, expiringSoon };
  }, [stockData]);

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Monitor and manage vaccine stock levels across all facilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
            <Package className="w-4 h-4" />
            <span>Receive Stock</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
          <input
            type="search"
            placeholder="Search vaccines, facilities, lot codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <p className="text-rose-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Total Vaccines</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalVaccines.toLocaleString()}</p>
          <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">Across {stockData.length} facilities</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.lowStock}</p>
          <p className="text-slate-600 dark:text-slate-500 text-sm mt-1">Facilities need restock</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Stockouts</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.stockouts}</p>
          <p className="text-slate-600 dark:text-slate-500 text-sm mt-1">Critical attention needed</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.expiringSoon}</p>
          <p className="text-slate-600 dark:text-slate-500 text-sm mt-1">Within 90 days</p>
        </div>
      </div>

      {/* Stock Data Table */}
      <div className="bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-200 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Facility</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Vaccine</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
              {filteredStockData.length > 0 ? (
                filteredStockData.map((item) => (
                  <tr key={item.nodeId} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{item.facilityName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-500">{item.state} • {item.lga}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 dark:text-slate-300">{item.productName}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-500">{item.lotCode}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.stockStatus === 'OPTIMAL' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        item.stockStatus === 'UNDERSTOCKED' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                        item.stockStatus === 'STOCKOUT' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                        'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      }`}>
                        {item.stockStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 dark:text-slate-300">{new Date(item.lotExpiry).toLocaleDateString()}</div>
                      <div className={`text-xs ${
                        item.expiryRisk === 'HIGH' ? 'text-orange-600 dark:text-orange-400' :
                        item.expiryRisk === 'EXPIRED' ? 'text-rose-600 dark:text-rose-400' :
                        'text-slate-600 dark:text-slate-500'
                      }`}>
                        {item.expiryRisk} Risk
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600 dark:text-slate-500">
                    No stock data found. Try adjusting your search or filters.
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
