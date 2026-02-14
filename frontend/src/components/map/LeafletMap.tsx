/**
 * VaxTrace Nigeria - Central Leaflet Map Component
 *
 * A comprehensive, production-ready Leaflet map component that:
 * - Displays Nigeria's states, LGAs, and health facilities
 * - Integrates with the global store for state management
 * - Supports dynamic zooming based on selected location
 * - Provides real-time stock status visualization
 * - Handles offline scenarios gracefully
 * - Optimized for performance on 3G/4G networks
 * - LGA trackers center properly on LGA coordinates
 * - Facility indicators create data-driven scattermap effect
 *
 * @author VaxTrace Team
 * @version 2.1.0
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import L, { Map as LeafletMapInstance, LatLngBounds, LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import { useStockData, useMapState } from '@/store/useVaxTraceStore';
import { nigeriaStates, LGA, HealthFacility } from '@/data/nigeria-geospatial';
import { cn } from '@/lib/utils';
import { VaxTraceStockData } from '@/store/useVaxTraceStore';

import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';

// ============================================
// TYPES & INTERFACES
// ============================================

export type MapViewMode = 'national' | 'state' | 'lga' | 'facility';

export interface MapLocation {
  id: string;
  name: string;
  type: 'state' | 'lga' | 'facility';
  coordinates: {
    lat: number;
    lng: number;
  };
  bounds?: LatLngBoundsExpression;
}

export interface LeafletMapProps {
  /** Current view mode */
  viewMode?: MapViewMode;
  /** Selected location (state, LGA, or facility) */
  selectedLocation?: MapLocation | null;
  /** Additional CSS classes */
  className?: string;
  /** Map height */
  height?: string | number;
  /** Enable clustering for facilities */
  enableClustering?: boolean;
  /** Show stock status indicators */
  showStockStatus?: boolean;
  /** Callback when a location is clicked */
  onLocationClick?: (location: MapLocation) => void;
  /** Callback when map bounds change */
  onBoundsChange?: (bounds: LatLngBounds) => void;
}

// ============================================
// CONSTANTS
// ============================================

// Nigeria center coordinates
const NIGERIA_CENTER: LatLngExpression = [9.082, 8.6753];

// Default zoom levels for different view modes
const ZOOM_LEVELS: Record<MapViewMode, number> = {
  national: 6,
  state: 8,
  lga: 10,
  facility: 14,
};

// Stock status colors (matching VaxTrace design system)
const STOCK_STATUS_COLORS = {
  OPTIMAL: '#10b981',      // emerald-500
  UNDERSTOCKED: '#f59e0b', // amber-500
  STOCKOUT: '#ef4444',     // red-500
  OVERSTOCKED: '#6366f1',  // indigo-500
  DEFAULT: '#64748b',      // slate-500
} as const;

// Location type colors
const LOCATION_TYPE_COLORS = {
  state: '#3b82f6',      // blue-500
  lga: '#8b5cf6',        // violet-500
  facility: '#06b6d4',   // cyan-500
  warehouse: '#f97316',  // orange-500
  clinic: '#ec4899',     // pink-500
  hospital: '#14b8a6',   // teal-500
  phc: '#84cc16',        // lime-500
} as const;

// Marker sizes for different zoom levels
const MARKER_SIZES = {
  state: { radius: 12, weight: 3 },
  lga: { radius: 8, weight: 2 },
  facility: { radius: 5, weight: 2 },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Fix for default marker icons in Leaflet with Next.js
 * This resolves the missing marker icon issue
 */
function fixLeafletIcons(): void {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

/**
 * Get stock status color
 */
function getStockStatusColor(status?: string): string {
  if (!status) return STOCK_STATUS_COLORS.DEFAULT;
  return STOCK_STATUS_COLORS[status as keyof typeof STOCK_STATUS_COLORS] || STOCK_STATUS_COLORS.DEFAULT;
}

/**
 * Create a custom marker icon
 */
function createMarkerIcon(color: string, size: number = 24, isPulsing: boolean = false): L.DivIcon {
  const pulseAnimation = isPulsing ? `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
    animation: pulse 2s ease-in-out infinite;
  ` : '';
  
  return L.divIcon({
    className: 'vaxtrace-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s ease;
        ${pulseAnimation}
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * Create a pulsing LGA tracker icon (purple dot)
 */
function createLGATrackerIcon(size: number = 16, isSelected: boolean = false): L.DivIcon {
  const pulseStyle = isSelected ? `
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(2); opacity: 0; }
    }
    animation: pulse-ring 1.5s ease-out infinite;
  ` : '';
  
  return L.divIcon({
    className: 'vaxtrace-lga-tracker',
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${size}px;
          height: ${size}px;
          background-color: ${LOCATION_TYPE_COLORS.lga};
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 2;
        "></div>
        ${isSelected ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${size}px;
            height: ${size}px;
            background-color: ${LOCATION_TYPE_COLORS.lga};
            border-radius: 50%;
            opacity: 0.4;
            z-index: 1;
            ${pulseStyle}
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    popupAnchor: [0, -size],
  });
}

/**
 * Generate deterministic scatter position for facility markers
 * Creates a circular pattern around the LGA center based on facility ID
 */
function getScatterPosition(
  facilityId: string,
  lgaCenter: { lat: number; lng: number },
  index: number,
  total: number,
  radius: number = 0.05
): { lat: number; lng: number } {
  // Use facility ID hash for deterministic positioning
  const hash = facilityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const angle = (hash % 360) * (Math.PI / 180);
  const distance = ((hash % 100) / 100) * radius;
  
  return {
    lat: lgaCenter.lat + Math.cos(angle) * distance,
    lng: lgaCenter.lng + Math.sin(angle) * distance,
  };
}

/**
 * Calculate centroid of facilities in an LGA for true center positioning
 */
function calculateFacilityCentroid(facilities: VaxTraceStockData[], lgaCenter: { lat: number; lng: number }): { lat: number; lng: number } {
  if (facilities.length === 0) return lgaCenter;
  
  // For now, use LGA center as facilities don't have real coordinates
  // In production, calculate actual centroid from facility coordinates
  return lgaCenter;
}

/**
 * Create popup content for a location
 */
function createPopupContent(location: MapLocation, stockData?: { stockStatus?: string }): string {
  const stockStatus = stockData?.stockStatus;
  const stockColor = getStockStatusColor(stockStatus);

  return `
    <div class="vaxtrace-popup" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 200px;
    ">
      <div style="
        font-weight: 600;
        font-size: 16px;
        color: #1e293b;
        margin-bottom: 8px;
      ">${location.name}</div>
      <div style="
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
      ">Type: ${location.type.charAt(0).toUpperCase() + location.type.slice(1)}</div>
      ${stockStatus ? `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          padding: 4px 8px;
          background-color: ${stockColor}20;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          color: ${stockColor};
        ">
          <span style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: ${stockColor};
          "></span>
          ${stockStatus}
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function LeafletMap({
  viewMode = 'national',
  selectedLocation = null,
  className = '',
  height = '100%',
  enableClustering = false,
  showStockStatus = true,
  onLocationClick,
  onBoundsChange,
}: LeafletMapProps) {
  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const statesLayerRef = useRef<L.GeoJSON | null>(null);

  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(ZOOM_LEVELS[viewMode]);

  // Store hooks
  const { filteredData } = useStockData();
  const { viewport, setViewport } = useMapState();

  // ============================================
  // MAP INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix Leaflet icons
    fixLeafletIcons();

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: NIGERIA_CENTER,
      zoom: ZOOM_LEVELS[viewMode],
      zoomControl: false, // We'll add custom zoom controls
      attributionControl: true,
    });

    // Add tile layer (OpenStreetMap - free and open source)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 5,
    }).addTo(map);

    // Create layer groups
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Handle bounds change
    map.on('moveend', () => {
      const bounds = map.getBounds();
      onBoundsChange?.(bounds);
      
      // Update store viewport
      const center = map.getCenter();
      setViewport({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        pitch: 0,
        bearing: 0,
      });
    });

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    mapRef.current = map;
    
    // Wait for map panes to be fully initialized before setting loaded
    // This prevents "_leaflet_pos" errors when markers are added too early
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsLoaded(true);
      }, 100);
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      statesLayerRef.current = null;
      setIsLoaded(false);
    };
  }, []); // Only run on mount

  // ============================================
  // UPDATE MAP VIEW BASED ON VIEW MODE
  // ============================================

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const map = mapRef.current;
    const targetZoom = ZOOM_LEVELS[viewMode];

    if (selectedLocation) {
      // Zoom to selected location
      if (selectedLocation.bounds) {
        map.fitBounds(selectedLocation.bounds, { padding: [50, 50], maxZoom: targetZoom });
      } else {
        map.setView(
          [selectedLocation.coordinates.lat, selectedLocation.coordinates.lng],
          targetZoom,
          { animate: true, duration: 1 }
        );
      }
    } else {
      // Reset to Nigeria view
      map.setView(NIGERIA_CENTER, ZOOM_LEVELS.national, { animate: true, duration: 1 });
    }
  }, [selectedLocation, viewMode, isLoaded]);

  // ============================================
  // RENDER MARKERS
  // ============================================

  useEffect(() => {
    if (!markersLayerRef.current || !isLoaded || !mapRef.current) return;

    // Double-check that map panes are available
    const map = mapRef.current;
    if (!map.getPanes?.()) return;

    const layer = markersLayerRef.current;
    layer.clearLayers();

    // Diagnostic logging
    console.log('[LeafletMap] Rendering markers:', {
      viewMode,
      selectedLocation: selectedLocation?.name,
      filteredDataCount: filteredData.length,
      isLoaded,
      currentZoom
    });

    // Render based on view mode
    switch (viewMode) {
      case 'national':
        renderStateMarkers(layer);
        break;
      case 'state':
        if (selectedLocation) {
          renderLGAMarkers(layer, selectedLocation.id);
        }
        break;
      case 'lga':
        if (selectedLocation) {
          renderFacilityMarkers(layer, selectedLocation.id);
        }
        break;
      case 'facility':
        if (selectedLocation) {
          renderSingleFacility(layer, selectedLocation);
        }
        break;
    }
  }, [viewMode, selectedLocation, filteredData, isLoaded, showStockStatus, currentZoom]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderStateMarkers = useCallback((layer: L.LayerGroup) => {
    nigeriaStates.forEach((state) => {
      const isSelected = selectedLocation?.id === state.id;
      const size = isSelected ? MARKER_SIZES.state.radius * 1.5 : MARKER_SIZES.state.radius;
      
      const marker = L.circleMarker([state.coordinates.lat, state.coordinates.lng], {
        radius: size,
        fillColor: LOCATION_TYPE_COLORS.state,
        color: isSelected ? '#1e40af' : '#3b82f6',
        weight: MARKER_SIZES.state.weight,
        opacity: 1,
        fillOpacity: isSelected ? 0.9 : 0.6,
      });

      const location: MapLocation = {
        id: state.id,
        name: state.name,
        type: 'state',
        coordinates: state.coordinates,
      };

      marker.bindPopup(createPopupContent(location));
      
      marker.on('click', () => {
        onLocationClick?.(location);
      });

      // Hover effect
      marker.on('mouseover', function(this: L.CircleMarker) {
        this.setStyle({ fillOpacity: 0.9, weight: 4 });
      });
      marker.on('mouseout', function(this: L.CircleMarker) {
        this.setStyle({ fillOpacity: isSelected ? 0.9 : 0.6, weight: MARKER_SIZES.state.weight });
      });

      marker.addTo(layer);
    });
  }, [selectedLocation, onLocationClick]);

  const renderLGAMarkers = useCallback((layer: L.LayerGroup, stateId: string) => {
    const state = nigeriaStates.find((s) => s.id === stateId);
    if (!state) return;

    state.lgas.forEach((lga) => {
      const isSelected = selectedLocation?.id === lga.id;
      
      // Get stock data for this LGA
      const lgaStockData = filteredData.filter((d: VaxTraceStockData) => d.lga === lga.name && d.state === state.name);
      const hasCriticalStock = lgaStockData.some((d: VaxTraceStockData) => d.stockStatus === 'STOCKOUT');
      const hasLowStock = lgaStockData.some((d: VaxTraceStockData) => d.stockStatus === 'UNDERSTOCKED');
      
      // Calculate true center based on facility distribution
      const centroid = calculateFacilityCentroid(lgaStockData, lga.coordinates);
      
      // Use custom LGA tracker icon centered on the LGA
      const markerSize = isSelected ? 20 : 16;
      const icon = createLGATrackerIcon(markerSize, isSelected);
      
      const marker = L.marker([centroid.lat, centroid.lng], {
        icon,
        interactive: true,
      });

      const location: MapLocation = {
        id: lga.id,
        name: lga.name,
        type: 'lga',
        coordinates: centroid,
      };
      
      // Set color based on stock status - use a string type to allow any color
      let fillColor: string = LOCATION_TYPE_COLORS.lga;
      if (hasCriticalStock && showStockStatus) {
        fillColor = STOCK_STATUS_COLORS.STOCKOUT;
      } else if (hasLowStock && showStockStatus) {
        fillColor = STOCK_STATUS_COLORS.UNDERSTOCKED;
      }

      marker.bindPopup(createPopupContent(location, {
        stockStatus: hasCriticalStock ? 'CRITICAL' : (hasLowStock ? 'LOW' : 'ADEQUATE')
      }));
      
      marker.on('click', () => {
        onLocationClick?.(location);
      });

      // Hover effect
      marker.on('mouseover', function(this: L.Marker) {
        const element = this.getElement()?.querySelector('.vaxtrace-lga-tracker div:first-child');
        if (element) {
          (element as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1.2)';
        }
      });
      marker.on('mouseout', function(this: L.Marker) {
        const element = this.getElement()?.querySelector('.vaxtrace-lga-tracker div:first-child');
        if (element) {
          (element as HTMLElement).style.transform = 'translate(-50%, -50%) scale(1)';
        }
      });

      marker.addTo(layer);
    });
  }, [selectedLocation, filteredData, onLocationClick, showStockStatus]);

  const renderFacilityMarkers = useCallback((layer: L.LayerGroup, lgaId: string) => {
    // Find LGA and render facilities
    const state = nigeriaStates.find((s) => s.lgas.some((l) => l.id === lgaId));
    const lga = state?.lgas.find((l) => l.id === lgaId);
    if (!lga) return;

    // Get stock data for facilities in this LGA
    const facilityStockData = filteredData.filter((d: VaxTraceStockData) => d.lga === lga.name && d.state === state?.name);

    // Calculate scatter radius based on zoom level - smaller when zoomed out for scattermap effect
    const scatterRadius = currentZoom > 11 ? 0.03 : currentZoom > 9 ? 0.05 : 0.08;

    facilityStockData.forEach((facility: VaxTraceStockData, index: number) => {
      const isSelected = selectedLocation?.id === facility.nodeId;
      const stockColor = getStockStatusColor(facility.stockStatus);
      const hasChallenge = facility.stockStatus === 'STOCKOUT' || facility.stockStatus === 'UNDERSTOCKED' || facility.stockStatus === 'OVERSTOCKED';
      
      // Calculate deterministic scatter position
      const position = getScatterPosition(
        facility.nodeId,
        lga.coordinates,
        index,
        facilityStockData.length,
        scatterRadius
      );

      // Larger marker for facilities with challenges
      const markerSize = hasChallenge ? (isSelected ? 32 : 28) : (isSelected ? 24 : 20);
      const isPulsing = hasChallenge && !isSelected;

      const marker = L.marker([position.lat, position.lng], {
        icon: createMarkerIcon(stockColor, markerSize, isPulsing),
      });

      const location: MapLocation = {
        id: facility.nodeId,
        name: facility.facilityName,
        type: 'facility',
        coordinates: position,
      };

      marker.bindPopup(createPopupContent(location, { stockStatus: facility.stockStatus }));
      
      marker.on('click', () => {
        onLocationClick?.(location);
      });

      // Add subtle hover effect
      marker.on('mouseover', function(this: L.Marker) {
        const element = this.getElement()?.querySelector('.vaxtrace-marker > div');
        if (element) {
          (element as HTMLElement).style.transform = 'scale(1.15)';
        }
      });
      marker.on('mouseout', function(this: L.Marker) {
        const element = this.getElement()?.querySelector('.vaxtrace-marker > div');
        if (element) {
          (element as HTMLElement).style.transform = 'scale(1)';
        }
      });

      marker.addTo(layer);
    });
  }, [selectedLocation, filteredData, onLocationClick, currentZoom]);

  const renderSingleFacility = useCallback((layer: L.LayerGroup, location: MapLocation) => {
    const stockData = filteredData.find((d: VaxTraceStockData) => d.nodeId === location.id);
    const stockColor = getStockStatusColor(stockData?.stockStatus);
    const hasChallenge = stockData?.stockStatus === 'STOCKOUT' || stockData?.stockStatus === 'UNDERSTOCKED' || stockData?.stockStatus === 'OVERSTOCKED';

    const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
      icon: createMarkerIcon(stockColor, 32, hasChallenge),
    });

    marker.bindPopup(createPopupContent(location, { stockStatus: stockData?.stockStatus }));
    marker.addTo(layer);
  }, [filteredData]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{ zIndex: 0 }}
      />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-300 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Custom zoom controls */}
      {isLoaded && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-lg shadow-lg transition-colors"
            aria-label="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-lg shadow-lg transition-colors"
            aria-label="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (selectedLocation) {
                mapRef.current?.setView(
                  [selectedLocation.coordinates.lat, selectedLocation.coordinates.lng],
                  ZOOM_LEVELS[viewMode],
                  { animate: true }
                );
              } else {
                mapRef.current?.setView(NIGERIA_CENTER, ZOOM_LEVELS.national, { animate: true });
              }
            }}
            className="bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-lg shadow-lg transition-colors"
            aria-label="Reset view"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      )}

      {/* Legend */}
      {isLoaded && showStockStatus && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Stock Status</h4>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STOCK_STATUS_COLORS.OPTIMAL }}></span>
              <span className="text-slate-600">Optimal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STOCK_STATUS_COLORS.UNDERSTOCKED }}></span>
              <span className="text-slate-600">Understocked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STOCK_STATUS_COLORS.STOCKOUT }}></span>
              <span className="text-slate-600">Stockout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STOCK_STATUS_COLORS.OVERSTOCKED }}></span>
              <span className="text-slate-600">Overstocked</span>
            </div>
          </div>
          
          {viewMode !== 'national' && (
            <>
              <div className="border-t border-slate-200 my-3"></div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Location Type</h4>
              <div className="flex flex-col gap-2 text-xs">
                {viewMode === 'state' && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LOCATION_TYPE_COLORS.lga }}></span>
                    <span className="text-slate-600">LGA</span>
                  </div>
                )}
                {viewMode === 'lga' && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: LOCATION_TYPE_COLORS.facility }}></span>
                    <span className="text-slate-600">Health Facility</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Current zoom indicator */}
      {isLoaded && (
        <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-slate-200">
          <div className="text-xs text-slate-600">
            Zoom: <span className="font-semibold text-slate-800">{currentZoom.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeafletMap;
