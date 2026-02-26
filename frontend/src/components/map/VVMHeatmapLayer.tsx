/**
 * VaxTrace Nigeria - VVM Heatmap Layer Component
 * 
 * AUDIT FIX: Implements VVM (Vaccine Vial Monitor) alert visualization
 * Shows heatmaps for Stage 3/4 VVM alerts across facilities
 * 
 * Features:
 * - Heatmap visualization for VVM Stage 3 (Warning) and Stage 4 (Critical)
 * - Circle layer with color-coded VVM status
 * - Dynamic radius based on alert severity
 * - Toggleable layer for different views
 * 
 * VVM Stages:
 * - Stage 1-2: Healthy (Green)
 * - Stage 3: Warning (Yellow/Orange) - Use with caution
 * - Stage 4: Critical (Red) - Do not use
 * 
 * @author Security Audit Implementation
 * @date 2026-02-24
 */

'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

// ============================================
// TYPES
// ============================================

interface VVMAlertData {
  facilityId: string;
  facilityName: string;
  latitude: number;
  longitude: number;
  vvmStage: 1 | 2 | 3 | 4;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  productName: string;
  lotNumber: string;
  expiryDate: string;
  alertCount: number;
}

interface VVMHeatmapLayerProps {
  map: mapboxgl.Map | null;
  vvmData: VVMAlertData[];
  visible: boolean;
  layerType?: 'heatmap' | 'circle';
}

// ============================================
// CONSTANTS
// ============================================

const VVM_COLORS = {
  STAGE_1_2: '#10B981', // Green - Healthy
  STAGE_3: '#F59E0B', // Orange - Warning
  STAGE_4: '#EF4444', // Red - Critical
};

const VVM_RADIUS = {
  STAGE_1_2: 10,
  STAGE_3: 20,
  STAGE_4: 30,
};

const SOURCE_ID = 'vvm-alerts-source';
const HEATMAP_LAYER_ID = 'vvm-heatmap-layer';
const CIRCLE_LAYER_ID = 'vvm-circle-layer';

// ============================================
// COMPONENT
// ============================================

export function VVMHeatmapLayer({
  map,
  vvmData,
  visible,
  layerType = 'circle',
}: VVMHeatmapLayerProps) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map || !visible || vvmData.length === 0) return;

    // Initialize layers only once
    if (!initializedRef.current) {
      initializeLayers(map);
      initializedRef.current = true;
    }

    // Update data
    updateLayerData(map, vvmData, layerType);

    // Set layer visibility
    setLayerVisibility(map, visible, layerType);

    return () => {
      // Cleanup on unmount
      if (map && initializedRef.current) {
        removeLayers(map);
        initializedRef.current = false;
      }
    };
  }, [map, vvmData, visible, layerType]);

  return null; // This component doesn't render anything directly
}

// ============================================
// LAYER INITIALIZATION
// ============================================

function initializeLayers(map: mapboxgl.Map) {
  // Check if source already exists
  if (map.getSource(SOURCE_ID)) {
    return;
  }

  // Add data source
  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  });

  // Add heatmap layer
  map.addLayer({
    id: HEATMAP_LAYER_ID,
    source: SOURCE_ID,
    type: 'heatmap',
    layout: { visibility: 'none' },
    paint: {
      // Weight VVM alerts by severity (Stage 4 = highest weight)
      'heatmap-weight': [
        'match',
        ['get', 'vvmStage'],
        1, 0.2,
        2, 0.3,
        3, 0.7,
        4, 1.0,
        0.5,
      ],
      // Heatmap intensity
      'heatmap-intensity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 1,
        9, 3,
      ],
      // Color ramp from green to red
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(16, 185, 129, 0)',
        0.2, 'rgba(16, 185, 129, 0.5)',
        0.4, 'rgba(245, 158, 11, 0.6)',
        0.6, 'rgba(245, 158, 11, 0.8)',
        0.8, 'rgba(239, 68, 68, 0.8)',
        1, 'rgba(239, 68, 68, 1)',
      ],
      // Heatmap radius
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 10,
        15, 50,
      ],
      // Heatmap opacity
      'heatmap-opacity': 0.7,
    },
  });

  // Add circle layer for individual alerts
  map.addLayer({
    id: CIRCLE_LAYER_ID,
    source: SOURCE_ID,
    type: 'circle',
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'match',
        ['get', 'vvmStage'],
        1, VVM_RADIUS.STAGE_1_2,
        2, VVM_RADIUS.STAGE_1_2,
        3, VVM_RADIUS.STAGE_3,
        4, VVM_RADIUS.STAGE_4,
        10,
      ],
      'circle-color': [
        'match',
        ['get', 'vvmStage'],
        1, VVM_COLORS.STAGE_1_2,
        2, VVM_COLORS.STAGE_1_2,
        3, VVM_COLORS.STAGE_3,
        4, VVM_COLORS.STAGE_4,
        '#888888',
      ],
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  });
}

// ============================================
// DATA UPDATE
// ============================================

function updateLayerData(map: mapboxgl.Map, vvmData: VVMAlertData[], layerType: string) {
  const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
  if (!source) return;

  // Convert VVM data to GeoJSON features
  const features = vvmData.map((alert) => ({
    type: 'Feature' as const,
    id: `${alert.facilityId}-${alert.lotNumber}`,
    geometry: {
      type: 'Point' as const,
      coordinates: [alert.longitude, alert.latitude],
    },
    properties: {
      facilityId: alert.facilityId,
      facilityName: alert.facilityName,
      vvmStage: alert.vvmStage,
      vvmStatus: alert.vvmStatus,
      productName: alert.productName,
      lotNumber: alert.lotNumber,
      expiryDate: alert.expiryDate,
      alertCount: alert.alertCount,
    },
  }));

  source.setData({
    type: 'FeatureCollection',
    features,
  });

  // Set appropriate layer visibility
  if (layerType === 'heatmap') {
    map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', 'visible');
    map.setLayoutProperty(CIRCLE_LAYER_ID, 'visibility', 'none');
  } else {
    map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', 'none');
    map.setLayoutProperty(CIRCLE_LAYER_ID, 'visibility', 'visible');
  }
}

// ============================================
// VISIBILITY CONTROL
// ============================================

function setLayerVisibility(map: mapboxgl.Map, visible: boolean, layerType: string) {
  const visibility = visible ? 'visible' : 'none';
  
  if (layerType === 'heatmap') {
    map.setLayoutProperty(HEATMAP_LAYER_ID, 'visibility', visibility);
  } else {
    map.setLayoutProperty(CIRCLE_LAYER_ID, 'visibility', visibility);
  }
}

// ============================================
// CLEANUP
// ============================================

function removeLayers(map: mapboxgl.Map) {
  if (map.getLayer(CIRCLE_LAYER_ID)) {
    map.removeLayer(CIRCLE_LAYER_ID);
  }
  if (map.getLayer(HEATMAP_LAYER_ID)) {
    map.removeLayer(HEATMAP_LAYER_ID);
  }
  if (map.getSource(SOURCE_ID)) {
    map.removeSource(SOURCE_ID);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Filters VVM data by stage
 */
export function filterVVMByStage(data: VVMAlertData[], stage: number): VVMAlertData[] {
  return data.filter((alert) => alert.vvmStage === stage);
}

/**
 * Gets VVM data for critical alerts (Stage 3 & 4)
 */
export function getCriticalVVMAlerts(data: VVMAlertData[]): VVMAlertData[] {
  return data.filter((alert) => alert.vvmStage >= 3);
}

/**
 * Groups VVM alerts by facility
 */
export function groupVVMByFacility(data: VVMAlertData[]): Map<string, VVMAlertData[]> {
  const grouped = new Map<string, VVMAlertData[]>();
  
  data.forEach((alert) => {
    const existing = grouped.get(alert.facilityId) || [];
    existing.push(alert);
    grouped.set(alert.facilityId, existing);
  });
  
  return grouped;
}

/**
 * Calculates VVM alert statistics
 */
export function calculateVVMStatistics(data: VVMAlertData[]) {
  const stats = {
    total: data.length,
    stage1: 0,
    stage2: 0,
    stage3: 0,
    stage4: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    facilitiesAffected: new Set<string>(),
  };

  data.forEach((alert) => {
    stats.facilitiesAffected.add(alert.facilityId);
    
    switch (alert.vvmStage) {
      case 1: stats.stage1++; break;
      case 2: stats.stage2++; break;
      case 3: stats.stage3++; break;
      case 4: stats.stage4++; break;
    }

    switch (alert.vvmStatus) {
      case 'HEALTHY': stats.healthy++; break;
      case 'WARNING': stats.warning++; break;
      case 'CRITICAL': stats.critical++; break;
    }
  });

  return {
    ...stats,
    facilitiesAffected: stats.facilitiesAffected.size,
  };
}
