/**
 * VaxTrace Nigeria - Lazy Loading Wrapper for Geospatial Data
 *
 * This file provides lazy loading for the nigeriaStates data to avoid
 * circular dependencies and module resolution issues during initialization.
 */

import { NigeriaState, LGA } from '@/data/nigeria-geospatial';

let cachedStates: NigeriaState[] = [];

/**
 * Lazy load the nigeriaStates data
 * This function loads the data on first call and caches it for subsequent calls
 */
export function getNigeriaStates(): NigeriaState[] {
  if (cachedStates.length > 0) {
    return cachedStates;
  }

  // Dynamic import to avoid circular dependencies
  const data = require('@/data/nigeria-geospatial');
  cachedStates = data.nigeriaStates || [];
  
  return cachedStates;
}

/**
 * Get a specific state by ID
 */
export function getStateById(stateId: string): NigeriaState | undefined {
  const states = getNigeriaStates();
  return states.find((state) => state.id === stateId);
}

/**
 * Get all LGAs for a specific state
 */
export function getLGAsForState(stateId: string): LGA[] {
  const state = getStateById(stateId);
  return state?.lgas || [];
}

/**
 * Get total counts
 */
export function getTotalStates(): number {
  return getNigeriaStates().length;
}

export function getTotalLGAs(): number {
  return getNigeriaStates().reduce((sum, state) => sum + state.lgas.length, 0);
}
