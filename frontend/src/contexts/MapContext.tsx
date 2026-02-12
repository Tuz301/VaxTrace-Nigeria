/**
 * VaxTrace Nigeria - Map Context
 *
 * Provides centralized map state management across the application.
 * Handles location selection, view mode transitions, and map interactions.
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

'use client';

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { LatLngBounds } from 'leaflet';
import { nigeriaStates, NigeriaState, LGA } from '@/data/nigeria-geospatial';
import { useStockData } from '@/store/useVaxTraceStore';
import { MapLocation, MapViewMode } from '@/components/map/LeafletMap';
import { VaxTraceStockData } from '@/store/useVaxTraceStore';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MapContextState {
  // Current view state
  viewMode: MapViewMode;
  selectedLocation: MapLocation | null;
  selectedState: NigeriaState | null;
  selectedLGA: LGA | null;
  
  // Navigation history
  history: MapLocation[];
  canGoBack: boolean;
  
  // Map bounds
  bounds: LatLngBounds | null;
}

export interface MapContextActions {
  // View mode control
  setViewMode: (mode: MapViewMode) => void;
  
  // Location selection
  selectState: (stateId: string) => void;
  selectLGA: (stateId: string, lgaId: string) => void;
  selectFacility: (facilityId: string) => void;
  clearSelection: () => void;
  
  // Navigation
  goBack: () => void;
  navigateToLocation: (location: MapLocation) => void;
  
  // Bounds
  setBounds: (bounds: LatLngBounds) => void;
  
  // Get location info
  getStateById: (stateId: string) => NigeriaState | undefined;
  getLGAById: (stateId: string, lgaId: string) => LGA | undefined;
  getAllStates: () => NigeriaState[];
}

export type MapContextValue = MapContextState & MapContextActions;

// ============================================
// CONTEXT
// ============================================

const MapContext = createContext<MapContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

interface MapProviderProps {
  children: React.ReactNode;
  initialViewMode?: MapViewMode;
}

export function MapProvider({ children, initialViewMode = 'national' }: MapProviderProps) {
  // Store hooks
  const { filteredData } = useStockData();

  // State
  const [viewMode, setViewModeState] = useState<MapViewMode>(initialViewMode);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [selectedState, setSelectedState] = useState<NigeriaState | null>(null);
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);
  const [history, setHistory] = useState<MapLocation[]>([]);
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);

  // ============================================
  // ACTIONS
  // ============================================

  const setViewMode = useCallback((mode: MapViewMode) => {
    setViewModeState(mode);
  }, []);

  const selectState = useCallback((stateId: string) => {
    const state = nigeriaStates.find((s) => s.id === stateId);
    if (!state) return;

    const location: MapLocation = {
      id: state.id,
      name: state.name,
      type: 'state',
      coordinates: state.coordinates,
    };

    setSelectedLocation(location);
    setSelectedState(state);
    setSelectedLGA(null);
    setViewModeState('state');
    setHistory((prev) => [...prev, location]);
  }, []);

  const selectLGA = useCallback((stateId: string, lgaId: string) => {
    const state = nigeriaStates.find((s) => s.id === stateId);
    const lga = state?.lgas.find((l) => l.id === lgaId);
    if (!state || !lga) return;

    const location: MapLocation = {
      id: lga.id,
      name: lga.name,
      type: 'lga',
      coordinates: lga.coordinates,
    };

    setSelectedLocation(location);
    setSelectedState(state);
    setSelectedLGA(lga);
    setViewModeState('lga');
    setHistory((prev) => [...prev, location]);
  }, []);

  const selectFacility = useCallback((facilityId: string) => {
    const facility = filteredData.find((f: VaxTraceStockData) => f.nodeId === facilityId);
    if (!facility) return;

    // Find state and LGA
    const state = nigeriaStates.find((s) => s.name === facility.state);
    const lga = state?.lgas.find((l) => l.name === facility.lga);

    const location: MapLocation = {
      id: facility.nodeId,
      name: facility.facilityName,
      type: 'facility',
      coordinates: lga?.coordinates || { lat: 0, lng: 0 },
    };

    setSelectedLocation(location);
    setSelectedState(state || null);
    setSelectedLGA(lga || null);
    setViewModeState('facility');
    setHistory((prev) => [...prev, location]);
  }, [filteredData]);

  const clearSelection = useCallback(() => {
    setSelectedLocation(null);
    setSelectedState(null);
    setSelectedLGA(null);
    setViewModeState('national');
    setHistory([]);
  }, []);

  const goBack = useCallback(() => {
    if (history.length <= 1) {
      clearSelection();
      return;
    }

    const newHistory = [...history];
    newHistory.pop(); // Remove current location
    
    const previousLocation = newHistory[newHistory.length - 1];
    if (previousLocation) {
      setSelectedLocation(previousLocation);
      
      // Restore state/LGA based on location type
      if (previousLocation.type === 'state') {
        const state = nigeriaStates.find((s) => s.id === previousLocation.id);
        setSelectedState(state || null);
        setSelectedLGA(null);
        setViewModeState('state');
      } else if (previousLocation.type === 'lga') {
        const state = nigeriaStates.find((s) =>
          s.lgas.some((l) => l.id === previousLocation.id)
        );
        const lga = state?.lgas.find((l) => l.id === previousLocation.id);
        setSelectedState(state || null);
        setSelectedLGA(lga || null);
        setViewModeState('lga');
      } else {
        setViewModeState('facility');
      }
    } else {
      clearSelection();
    }

    setHistory(newHistory);
  }, [history, clearSelection]);

  const navigateToLocation = useCallback((location: MapLocation) => {
    switch (location.type) {
      case 'state':
        selectState(location.id);
        break;
      case 'lga':
        // Find parent state
        const state = nigeriaStates.find((s) =>
          s.lgas.some((l) => l.id === location.id)
        );
        if (state) {
          selectLGA(state.id, location.id);
        }
        break;
      case 'facility':
        selectFacility(location.id);
        break;
    }
  }, [selectState, selectLGA, selectFacility]);

  // ============================================
  // GETTERS
  // ============================================

  const getStateById = useCallback((stateId: string) => {
    return nigeriaStates.find((s) => s.id === stateId);
  }, []);

  const getLGAById = useCallback((stateId: string, lgaId: string) => {
    const state = nigeriaStates.find((s) => s.id === stateId);
    return state?.lgas.find((l) => l.id === lgaId);
  }, []);

  const getAllStates = useCallback(() => {
    return nigeriaStates;
  }, []);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: MapContextValue = {
    // State
    viewMode,
    selectedLocation,
    selectedState,
    selectedLGA,
    history,
    canGoBack: history.length > 0,
    bounds,
    
    // Actions
    setViewMode,
    selectState,
    selectLGA,
    selectFacility,
    clearSelection,
    goBack,
    navigateToLocation,
    setBounds,
    
    // Getters
    getStateById,
    getLGAById,
    getAllStates,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to use the map context
 * Throws an error if used outside of MapProvider
 */
export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  
  return context;
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook to get the current location path (e.g., "Kano > Kano Municipal")
 */
export function useLocationPath(): string {
  const { selectedState, selectedLGA, selectedLocation } = useMapContext();
  
  const parts: string[] = [];
  if (selectedState) parts.push(selectedState.name);
  if (selectedLGA) parts.push(selectedLGA.name);
  if (selectedLocation?.type === 'facility') parts.push(selectedLocation.name);
  
  return parts.join(' > ');
}

/**
 * Hook to check if a location is selected
 */
export function useIsLocationSelected(locationId: string): boolean {
  const { selectedLocation } = useMapContext();
  return selectedLocation?.id === locationId;
}

/**
 * Hook to get location statistics
 */
export function useLocationStats() {
  const { selectedState, selectedLGA } = useMapContext();
  const { filteredData } = useStockData();

  return useMemo(() => {
    let facilities = filteredData;
    
    if (selectedLGA) {
      facilities = facilities.filter(
        (f: VaxTraceStockData) => f.state === selectedState?.name && f.lga === selectedLGA.name
      );
    } else if (selectedState) {
      facilities = facilities.filter((f: VaxTraceStockData) => f.state === selectedState.name);
    }

    return {
      totalFacilities: facilities.length,
      criticalStock: facilities.filter((f: VaxTraceStockData) => f.stockStatus === 'STOCKOUT').length,
      understocked: facilities.filter((f: VaxTraceStockData) => f.stockStatus === 'UNDERSTOCKED').length,
      adequateStock: facilities.filter((f: VaxTraceStockData) => f.stockStatus === 'OPTIMAL').length,
      overstocked: facilities.filter((f: VaxTraceStockData) => f.stockStatus === 'OVERSTOCKED').length,
    };
  }, [selectedState, selectedLGA, filteredData]);
}
