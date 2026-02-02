/**
 * VaxTrace Nigeria - Neural Map Component
 * 
 * A 3D geospatial visualization of Nigeria's vaccine supply chain
 * using Mapbox GL JS with the "Obsidian Glass" theme.
 * 
 * Features:
 * - 3D extruded nodes for facilities
 * - Stoplight color coding (Crimson/Cyan/Neon Mint)
 * - Interactive filtering and selection
 * - Real-time data updates
 * - Performance optimized for 3G/4G
 * - Offline tile support
 * 
 * Color Palette:
 * - OPTIMAL: #00F5A0 (Neon Mint)
 * - UNDERSTOCKED: #FFB800 (Electric Amber)
 * - STOCKOUT: #FF4B2B (Crimson Pulse)
 * - OVERSTOCKED: #6366F1 (Indigo)
 * - WAREHOUSE: #06B6D4 (Cyan)
 * - CLINIC: #8B5CF6 (Violet)
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Map, NavigationControl, GeolocateControl, ScaleControl } from 'mapbox-gl';
import { useMapState, useStockData } from '@/store/useVaxTraceStore';
import { cn } from '@/lib/utils';
import { FallbackMap } from './FallbackMap';

// Initialize Mapbox access token from environment variable
// For development, you can use a placeholder or get your free token at: https://account.mapbox.com/
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = mapboxToken;

// If no token is configured, show a warning in development
if (typeof window !== 'undefined' && !mapboxToken && process.env.NODE_ENV === 'development') {
  console.warn('[NeuralMap] Mapbox access token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env.local file.');
}

// ============================================
// TYPES
// ============================================

interface NeuralMapProps {
  className?: string;
  height?: string | number;
  show3D?: boolean;
  enableGlobe?: boolean;
}

interface MapNode {
  id: string;
  label: string;
  code: string;
  state: string;
  lga: string;
  lat: number;
  lng: number;
  nodeType: 'WAREHOUSE' | 'CLINIC' | 'HOSPITAL' | 'PHC';
  hasColdChain: boolean;
  hasRTM: boolean;
  stockStatus: 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED';
  alertCount: number;
  lastSync: string;
}

// ============================================
// CONSTANTS
// ============================================

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

const COLORS = {
  OPTIMAL: '#00F5A0',
  UNDERSTOCKED: '#FFB800',
  STOCKOUT: '#FF4B2B',
  OVERSTOCKED: '#6366F1',
  WAREHOUSE: '#06B6D4',
  CLINIC: '#8B5CF6',
  HOSPITAL: '#EC4899',
  PHC: '#10B981',
  SELECTED: '#FFFFFF',
};

const SOURCE_ID = 'vaxtrace-nodes';
const LAYER_ID = 'vaxtrace-nodes-layer';

// ============================================
// COMPONENT
// ============================================

export function NeuralMap({
  className,
  height = '100%',
  show3D = true,
  enableGlobe = false,
}: NeuralMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Store hooks
  const { nodes, viewport, filters, selectedNode, setViewport, setSelectedNode } = useMapState();
  const { filteredData } = useStockData();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create map instance
    const mapInstance = new Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: viewport.center,
      zoom: viewport.zoom,
      pitch: show3D ? 60 : 0,
      bearing: viewport.bearing,
      projection: enableGlobe ? 'globe' : 'mercator',
      antialias: true,
      attributionControl: false,
    });

    // Add controls
    mapInstance.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    mapInstance.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right');
    mapInstance.addControl(new ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    // Event listeners
    mapInstance.on('load', () => {
      setIsLoaded(true);
      console.log('[NeuralMap] Map loaded');
    });

    mapInstance.on('moveend', () => {
      if (map.current) {
        const center = map.current.getCenter();
        const zoom = map.current.getZoom();
        const pitch = map.current.getPitch();
        const bearing = map.current.getBearing();

        setViewport({
          center: [center.lng, center.lat],
          zoom,
          pitch,
          bearing,
        });
      }
    });

    map.current = mapInstance;

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update viewport when store changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const currentCenter = map.current.getCenter();
    const currentZoom = map.current.getZoom();

    // Only update if significantly different
    if (
      Math.abs(currentCenter.lng - viewport.center[0]) > 0.001 ||
      Math.abs(currentCenter.lat - viewport.center[1]) > 0.001 ||
      Math.abs(currentZoom - viewport.zoom) > 0.1
    ) {
      map.current.easeTo({
        center: viewport.center,
        zoom: viewport.zoom,
        pitch: show3D ? 60 : 0,
        bearing: viewport.bearing,
        duration: 1000,
      });
    }
  }, [viewport.center, viewport.zoom, viewport.bearing, show3D, isLoaded]);

  // Update data source when nodes change
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    const mapInstance = map.current;

    // Check if source exists
    const source = mapInstance.getSource(SOURCE_ID);

    if (source) {
      // Update existing source
      (source as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: nodes.map((node) => createNodeFeature(node, filteredData)),
      });
    } else {
      // Create new source
      mapInstance.addSource(SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: nodes.map((node) => createNodeFeature(node, filteredData)),
        },
      });

      // Add layer
      mapInstance.addLayer({
        id: LAYER_ID,
        source: SOURCE_ID,
        type: 'circle',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            8,
            12,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.9,
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            2,
            4,
          ],
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Add labels
      mapInstance.addLayer({
        id: `${LAYER_ID}-labels`,
        source: SOURCE_ID,
        type: 'symbol',
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Inter SemiBold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 1.5],
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        },
      });

      // Click handler
      mapInstance.on('click', LAYER_ID, (e) => {
        if (e.features && e.features[0]) {
          const node = JSON.parse(e.features[0].properties?.node || '{}');
          setSelectedNode(node);
        }
      });

      // Hover cursor
      mapInstance.on('mouseenter', LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = 'pointer';
      });

      mapInstance.on('mouseleave', LAYER_ID, () => {
        mapInstance.getCanvas().style.cursor = '';
      });
    }

    // Update selected state
    if (selectedNode) {
      mapInstance.setFeatureState(
        { source: SOURCE_ID, id: selectedNode.id },
        { selected: true }
      );
    }
  }, [nodes, filteredData, selectedNode, isLoaded]);

  // Fit bounds to filtered nodes
  const fitBounds = useCallback(() => {
    if (!map.current || nodes.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    nodes.forEach((node) => {
      bounds.extend([node.lng, node.lat]);
    });

    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000,
    });
  }, [nodes]);

  // Reset view
  const resetView = useCallback(() => {
    if (!map.current) return;

    map.current.easeTo({
      center: [8.6753, 9.0820],
      zoom: 5.5,
      pitch: show3D ? 60 : 0,
      bearing: 0,
      duration: 1000,
    });
  }, [show3D]);

  // Show fallback map if Mapbox token is not configured
  if (!mapboxToken) {
    return <FallbackMap />;
  }

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      {/* Map Container */}
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />

      {/* Map Controls Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={fitBounds}
          className={cn(
            'px-3 py-2 rounded-lg bg-slate-800/80 backdrop-blur-sm',
            'text-white text-sm font-medium',
            'hover:bg-slate-700/80 transition-colors',
            'border border-slate-600/50'
          )}
        >
          Fit Bounds
        </button>
        <button
          onClick={resetView}
          className={cn(
            'px-3 py-2 rounded-lg bg-slate-800/80 backdrop-blur-sm',
            'text-white text-sm font-medium',
            'hover:bg-slate-700/80 transition-colors',
            'border border-slate-600/50'
          )}
        >
          Reset View
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10">
        <MapLegend />
      </div>

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300 text-sm">Loading Neural Map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Creates a GeoJSON feature for a map node
 */
function createNodeFeature(node: MapNode, stockData: any[]): GeoJSON.Feature {
  // Determine color based on stock status
  const color = getNodeColor(node);

  // Get stock info for this facility
  const facilityStock = stockData.filter((s) => s.nodeId === node.id);
  const totalStock = facilityStock.reduce((sum, s) => sum + s.quantity, 0);
  const alertCount = facilityStock.filter((s) => s.vvmStatus === 'CRITICAL').length;

  return {
    type: 'Feature',
    id: node.id,
    geometry: {
      type: 'Point',
      coordinates: [node.lng, node.lat],
    },
    properties: {
      id: node.id,
      label: node.label,
      code: node.code,
      state: node.state,
      lga: node.lga,
      nodeType: node.nodeType,
      stockStatus: node.stockStatus,
      hasColdChain: node.hasColdChain,
      hasRTM: node.hasRTM,
      totalStock,
      alertCount,
      color,
      node: JSON.stringify(node),
    },
  };
}

/**
 * Gets the color for a node based on its status
 */
function getNodeColor(node: MapNode): string {
  // Stock status takes priority
  if (node.stockStatus === 'STOCKOUT') return COLORS.STOCKOUT;
  if (node.stockStatus === 'UNDERSTOCKED') return COLORS.UNDERSTOCKED;
  if (node.stockStatus === 'OVERSTOCKED') return COLORS.OVERSTOCKED;

  // Node type color
  switch (node.nodeType) {
    case 'WAREHOUSE':
      return COLORS.WAREHOUSE;
    case 'CLINIC':
      return COLORS.CLINIC;
    case 'HOSPITAL':
      return COLORS.HOSPITAL;
    case 'PHC':
      return COLORS.PHC;
    default:
      return COLORS.OPTIMAL;
  }
}

// ============================================
// MAP LEGEND COMPONENT
// ============================================

function MapLegend() {
  const legendItems = [
    { label: 'Optimal', color: COLORS.OPTIMAL },
    { label: 'Understocked', color: COLORS.UNDERSTOCKED },
    { label: 'Stockout', color: COLORS.STOCKOUT },
    { label: 'Overstocked', color: COLORS.OVERSTOCKED },
    { label: 'Warehouse', color: COLORS.WAREHOUSE },
    { label: 'Clinic', color: COLORS.CLINIC },
    { label: 'Hospital', color: COLORS.HOSPITAL },
    { label: 'PHC', color: COLORS.PHC },
  ];

  return (
    <div
      className={cn(
        'bg-slate-900/90 backdrop-blur-sm rounded-lg p-3',
        'border border-slate-700/50',
        'shadow-xl'
      )}
    >
      <h3 className="text-white text-xs font-semibold mb-2 uppercase tracking-wide">
        Legend
      </h3>
      <div className="space-y-1.5">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-300 text-xs">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// NODE INFO POPUP
// ============================================

interface NodeInfoPopupProps {
  node: MapNode;
  stockData: any[];
  onClose: () => void;
}

export function NodeInfoPopup({ node, stockData, onClose }: NodeInfoPopupProps) {
  const facilityStock = stockData.filter((s) => s.nodeId === node.id);
  const totalStock = facilityStock.reduce((sum, s) => sum + s.quantity, 0);
  const criticalItems = facilityStock.filter((s) => s.vvmStatus === 'CRITICAL');

  return (
    <div
      className={cn(
        'bg-slate-900 rounded-lg p-4 shadow-xl',
        'border border-slate-700/50',
        'min-w-[300px]'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">{node.label}</h3>
          <p className="text-slate-400 text-sm">
            {node.lga}, {node.state}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getNodeColor(node) }}
        />
        <span className="text-slate-300 text-sm capitalize">
          {node.stockStatus.toLowerCase()}
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Total Stock:</span>
          <span className="text-white font-medium">{totalStock} vials</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Alerts:</span>
          <span className={cn(
            'font-medium',
            criticalItems.length > 0 ? 'text-red-400' : 'text-emerald-400'
          )}>
            {criticalItems.length} critical
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className={cn(
            'flex-1 px-3 py-2 rounded-lg',
            'bg-emerald-600 text-white text-sm font-medium',
            'hover:bg-emerald-700 transition-colors'
          )}
        >
          View Details
        </button>
        <button
          className={cn(
            'flex-1 px-3 py-2 rounded-lg',
            'bg-slate-700 text-white text-sm font-medium',
            'hover:bg-slate-600 transition-colors'
          )}
        >
          Navigate
        </button>
      </div>
    </div>
  );
}
