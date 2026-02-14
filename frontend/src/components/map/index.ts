/**
 * VaxTrace Nigeria - Map Components Index
 *
 * Central export point for all map-related components.
 * Import from this file for cleaner imports:
 *
 * @example
 * import { LeafletMap, LocationMap, StateViewMap } from '@/components/map';
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

// Main map components
export { LeafletMap } from './LeafletMap';
export type { MapLocation, MapViewMode, LeafletMapProps } from './LeafletMap';

// Location map wrappers
export { 
  LocationMap, 
  StateViewMap, 
  LGAViewMap, 
  FacilityViewMap, 
  NationalViewMap 
} from './LocationMap';
export type { LocationMapProps } from './LocationMap';

// Legacy map components (for backward compatibility)
export { FallbackMap } from './FallbackMap';
export { NeuralMap } from './NeuralMap';

// Error boundary for map components
export { MapErrorBoundary } from './MapErrorBoundary';

// Re-export map context for convenience
export { 
  MapProvider, 
  useMapContext, 
  useLocationPath, 
  useIsLocationSelected, 
  useLocationStats 
} from '@/contexts/MapContext';
export type { 
  MapContextState, 
  MapContextActions, 
  MapContextValue 
} from '@/contexts/MapContext';
