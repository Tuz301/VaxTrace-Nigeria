/**
 * VaxTrace Nigeria - Location Map Wrapper Component
 *
 * A wrapper component that integrates the LeafletMap with the MapContext
 * for seamless location-based navigation. This component is designed to be
 * used across state, LGA, and facility pages.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

'use client';

import React, { useMemo } from 'react';
import type { LatLngBoundsExpression, LatLngBounds } from 'leaflet';
import { LeafletMap, MapLocation, MapViewMode } from './LeafletMap';
import { useMapContext } from '@/contexts/MapContext';
import { nigeriaStates } from '@/data/nigeria-geospatial';
import { cn } from '@/lib/utils';

// Lazy load Leaflet only on client side
const getLeaflet = async () => {
  if (typeof window !== 'undefined') {
    return await import('leaflet');
  }
  return null;
};

export interface LocationMapProps {
  /** Additional CSS classes */
  className?: string;
  /** Map height */
  height?: string | number;
  /** Override the view mode (defaults to context view mode) */
  viewMode?: MapViewMode;
  /** Show stock status indicators */
  showStockStatus?: boolean;
  /** Enable fullscreen mode */
  enableFullscreen?: boolean;
}

/**
 * LocationMap component
 * 
 * This component wraps the LeafletMap and integrates it with the MapContext
 * to provide automatic location-based navigation and state management.
 */
export function LocationMap({
  className = '',
  height = '100%',
  viewMode,
  showStockStatus = true,
  enableFullscreen = false,
}: LocationMapProps) {
  const {
    viewMode: contextViewMode,
    selectedLocation,
    selectedState,
    selectedLGA,
    navigateToLocation,
    setBounds,
  } = useMapContext();

  // Determine the current view mode
  const currentViewMode = viewMode || contextViewMode;

  // Create bounds for the selected location
  const locationWithBounds = useMemo(() => {
    if (!selectedLocation) return null;

    let bounds: LatLngBoundsExpression | undefined;

    if (selectedLocation.type === 'state' && selectedState) {
      // Create bounds for the state based on its LGAs
      if (selectedState.lgas.length > 0) {
        const latlngs = selectedState.lgas.map((lga) => [lga.coordinates.lat, lga.coordinates.lng] as [number, number]);
        // Use array format for bounds instead of L.latLngBounds
        bounds = latlngs as any;
      }
    } else if (selectedLocation.type === 'lga' && selectedLGA) {
      // Create bounds for the LGA (smaller area)
      const { lat, lng } = selectedLGA.coordinates;
      bounds = [
        [lat - 0.1, lng - 0.1],
        [lat + 0.1, lng + 0.1],
      ] as LatLngBoundsExpression;
    }

    return {
      ...selectedLocation,
      bounds,
    };
  }, [selectedLocation, selectedState, selectedLGA]);

  // Handle location click
  const handleLocationClick = (location: MapLocation) => {
    navigateToLocation(location);
  };

  // Handle bounds change
  const handleBoundsChange = (bounds: LatLngBounds) => {
    setBounds(bounds);
  };

  return (
    <div className={cn('relative', className)}>
      <LeafletMap
        viewMode={currentViewMode}
        selectedLocation={locationWithBounds}
        height={height}
        showStockStatus={showStockStatus}
        onLocationClick={handleLocationClick}
        onBoundsChange={handleBoundsChange}
        className="rounded-lg overflow-hidden"
      />
    </div>
  );
}

/**
 * StateViewMap component
 * 
 * A specialized map component for state-level views.
 * Shows all LGAs within the selected state.
 */
export function StateViewMap({ className = '', height = '400px' }: { className?: string; height?: string | number }) {
  const { selectedState } = useMapContext();

  if (!selectedState) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-800 rounded-lg', className)} style={{ height }}>
        <p className="text-slate-400">No state selected</p>
      </div>
    );
  }

  return (
    <LocationMap
      viewMode="state"
      height={height}
      showStockStatus={true}
      className={className}
    />
  );
}

/**
 * LGAViewMap component
 * 
 * A specialized map component for LGA-level views.
 * Shows all facilities within the selected LGA.
 */
export function LGAViewMap({ className = '', height = '400px' }: { className?: string; height?: string | number }) {
  const { selectedLGA } = useMapContext();

  if (!selectedLGA) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-800 rounded-lg', className)} style={{ height }}>
        <p className="text-slate-400">No LGA selected</p>
      </div>
    );
  }

  return (
    <LocationMap
      viewMode="lga"
      height={height}
      showStockStatus={true}
      className={className}
    />
  );
}

/**
 * FacilityViewMap component
 * 
 * A specialized map component for facility-level views.
 * Shows the selected facility with detailed stock status.
 */
export function FacilityViewMap({ className = '', height = '300px' }: { className?: string; height?: string | number }) {
  const { selectedLocation } = useMapContext();

  if (!selectedLocation || selectedLocation.type !== 'facility') {
    return (
      <div className={cn('flex items-center justify-center bg-slate-800 rounded-lg', className)} style={{ height }}>
        <p className="text-slate-400">No facility selected</p>
      </div>
    );
  }

  return (
    <LocationMap
      viewMode="facility"
      height={height}
      showStockStatus={true}
      className={className}
    />
  );
}

/**
 * NationalViewMap component
 * 
 * A specialized map component for national-level views.
 * Shows all states in Nigeria.
 */
export function NationalViewMap({ className = '', height = '500px' }: { className?: string; height?: string | number }) {
  return (
    <LocationMap
      viewMode="national"
      height={height}
      showStockStatus={true}
      className={className}
    />
  );
}

export default LocationMap;
