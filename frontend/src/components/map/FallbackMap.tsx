/**
 * VaxTrace Nigeria - Fallback Map Component
 * 
 * A simple placeholder map component that displays when Mapbox token is not configured.
 * Shows a list of facilities with their stock status instead of an interactive map.
 */

'use client';

import React from 'react';
import { MapPin, AlertTriangle, Package, Activity } from 'lucide-react';
import { useStockData } from '@/store/useVaxTraceStore';
import Link from 'next/link';

export function FallbackMap() {
  const { filteredData } = useStockData();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
      case 'ADEQUATE':
        return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
      case 'UNDERSTOCKED':
      case 'LOW':
        return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      case 'STOCKOUT':
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-400/10 border-rose-400/30';
      case 'OVERSTOCKED':
        return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
      default:
        return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
      case 'ADEQUATE':
        return <Activity className="w-4 h-4" />;
      case 'UNDERSTOCKED':
      case 'LOW':
        return <Package className="w-4 h-4" />;
      case 'STOCKOUT':
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full w-full bg-slate-900/50 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Facility Map
          </h3>
          <div className="text-xs text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30">
            Mapbox token not configured
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file to enable the interactive 3D map.
        </p>
      </div>

      {/* Facility List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredData.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No facility data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredData.slice(0, 20).map((facility) => (
              <Link
                key={facility.nodeId}
                href={`/facility/${facility.nodeId}`}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">
                      {facility.facilityName}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      {facility.state}, {facility.lga}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getStatusColor(facility.stockStatus)}`}>
                    {getStatusIcon(facility.stockStatus)}
                    <span className="font-medium">{facility.stockStatus}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span className="text-white font-medium">{facility.quantity}</span> doses
                  </div>
                  <div className="text-slate-500">
                    {facility.productName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {filteredData.length > 20 && (
          <div className="text-center text-xs text-slate-500 mt-4">
            Showing 20 of {filteredData.length} facilities
          </div>
        )}
      </div>
    </div>
  );
}
