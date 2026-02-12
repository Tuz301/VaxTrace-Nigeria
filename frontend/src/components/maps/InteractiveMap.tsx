/**
 * VaxTrace Nigeria - Interactive Map Component
 * 
 * Uses Leaflet for open-source geospatial mapping
 * Supports state, LGA, and health facility views
 * 
 * @see https://leafletjs.com/
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { nigeriaStates } from '@/data/nigeria-geospatial';

// Fix for default marker icons in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  type: 'state' | 'lga' | 'facility';
  status?: 'normal' | 'warning' | 'critical';
  onClick?: () => void;
}

export interface InteractiveMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  showStates?: boolean;
  showLGAs?: boolean;
  showFacilities?: boolean;
  selectedState?: string;
  selectedLGA?: string;
  className?: string;
  height?: string;
}

export function InteractiveMap({
  center = [9.5, 7.5], // Center of Nigeria
  zoom = 6,
  markers = [],
  onMarkerClick,
  showStates = true,
  showLGAs = false,
  showFacilities = false,
  selectedState,
  selectedLGA,
  className = '',
  height = '500px',
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);

    // Add OpenStreetMap tiles (free, open-source)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    setIsLoaded(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Update map center and zoom
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!markersRef.current || !isLoaded) return;

    markersRef.current.clearLayers();

    // Add state markers
    if (showStates) {
      nigeriaStates.forEach((state) => {
        const isSelected = selectedState === state.id;
        const marker = L.circleMarker([state.coordinates.lat, state.coordinates.lng], {
          radius: isSelected ? 15 : 10,
          fillColor: isSelected ? '#3b82f6' : '#10b981',
          color: isSelected ? '#1d4ed8' : '#059669',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        });

        marker.bindPopup(`
          <div class="text-sm">
            <strong class="text-lg">${state.name}</strong>
            <p class="text-gray-600">Capital: ${state.capital}</p>
            <p class="text-gray-600">LGAs: ${state.lgas.length}</p>
            ${isSelected ? '<p class="text-blue-600 mt-2">Selected</p>' : ''}
          </div>
        `);

        marker.on('click', () => {
          const mapMarker: MapMarker = {
            id: state.id,
            position: [state.coordinates.lat, state.coordinates.lng],
            title: state.name,
            description: `Capital: ${state.capital}, LGAs: ${state.lgas.length}`,
            type: 'state',
          };
          onMarkerClick?.(mapMarker);
        });
  
        if (markersRef.current) {
          marker.addTo(markersRef.current);
        }
      });
    }

    // Add LGA markers
    if (showLGAs && selectedState) {
      const state = nigeriaStates.find((s) => s.id === selectedState);
      if (state) {
        state.lgas.forEach((lga) => {
          const isSelected = selectedLGA === lga.id;
          const marker = L.circleMarker([lga.coordinates.lat, lga.coordinates.lng], {
            radius: isSelected ? 12 : 8,
            fillColor: isSelected ? '#f59e0b' : '#8b5cf6',
            color: isSelected ? '#d97706' : '#7c3aed',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
          });

          marker.bindPopup(`
            <div class="text-sm">
              <strong class="text-lg">${lga.name}</strong>
              <p class="text-gray-600">LGA Code: ${lga.code}</p>
              <p class="text-gray-600">Facilities: ${lga.facilities.length}</p>
              ${isSelected ? '<p class="text-amber-600 mt-2">Selected</p>' : ''}
            </div>
          `);

          marker.on('click', () => {
            const mapMarker: MapMarker = {
              id: lga.id,
              position: [lga.coordinates.lat, lga.coordinates.lng],
              title: lga.name,
              description: `LGA Code: ${lga.code}, Facilities: ${lga.facilities.length}`,
              type: 'lga',
            };
            onMarkerClick?.(mapMarker);
          });

          if (markersRef.current) {
            marker.addTo(markersRef.current);
          }
        });
      }
    }

    // Add facility markers
    if (showFacilities && selectedLGA) {
      const state = nigeriaStates.find((s) => s.id === selectedState);
      const lga = state?.lgas.find((l) => l.id === selectedLGA);
      if (lga) {
        lga.facilities.forEach((facility) => {
          const statusColor = {
            normal: '#10b981',
            warning: '#f59e0b',
            critical: '#ef4444',
          }[facility.type === 'general' ? 'normal' : facility.type === 'specialist' ? 'warning' : 'critical'];

          const marker = L.marker([facility.coordinates.lat, facility.coordinates.lng], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: `<div style="background-color: ${statusColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            }),
          });

          marker.bindPopup(`
            <div class="text-sm">
              <strong class="text-lg">${facility.name}</strong>
              <p class="text-gray-600">Type: ${facility.type}</p>
              <p class="text-gray-600">Level: ${facility.level}</p>
              <p class="text-gray-600">Ward: ${facility.ward}</p>
              ${facility.phone ? `<p class="text-gray-600">Phone: ${facility.phone}</p>` : ''}
            </div>
          `);

          marker.on('click', () => {
            const mapMarker: MapMarker = {
              id: facility.id,
              position: [facility.coordinates.lat, facility.coordinates.lng],
              title: facility.name,
              description: `Type: ${facility.type}, Level: ${facility.level}`,
              type: 'facility',
              status: facility.type === 'general' ? 'normal' : facility.type === 'specialist' ? 'warning' : 'critical',
            };
            onMarkerClick?.(mapMarker);
          });

          if (markersRef.current) {
            marker.addTo(markersRef.current);
          }
        });
      }
    }

    // Add custom markers from props
    markers.forEach((markerData) => {
      const color = {
        normal: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444',
      }[markerData.status || 'normal'];

      const marker = L.marker(markerData.position, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        }),
      });

      marker.bindPopup(`
        <div class="text-sm">
          <strong class="text-lg">${markerData.title}</strong>
          ${markerData.description ? `<p class="text-gray-600">${markerData.description}</p>` : ''}
        </div>
      `);

      marker.on('click', () => {
        onMarkerClick?.(markerData);
        markerData.onClick?.();
      });

      if (markersRef.current) {
        marker.addTo(markersRef.current);
      }
    });
  }, [markers, showStates, showLGAs, showFacilities, selectedState, selectedLGA, onMarkerClick, isLoaded]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="absolute inset-0 z-0 rounded-lg overflow-hidden" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 6) + 1)}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Zoom in"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() || 6) - 1)}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Zoom out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.setView(center, zoom)}
          className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          aria-label="Reset view"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white p-3 rounded-lg shadow-md">
        <h4 className="text-sm font-semibold mb-2">Legend</h4>
        <div className="flex flex-col gap-1 text-xs">
          {showStates && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span>States</span>
            </div>
          )}
          {showLGAs && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500"></div>
              <span>LGAs</span>
            </div>
          )}
          {showFacilities && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span>General Hospital</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span>Specialist</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Other</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;
