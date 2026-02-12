/**
 * VaxTrace Nigeria - LMD Delivery Tracker Component
 * 
 * Mobile-first component for field officers (SCCOs/LCCOs)
 * to capture Last-Mile Delivery data offline
 * 
 * Features:
 * - Offline data capture with IndexedDB
 * - GPS location tracking
 * - VVM status recording
 * - Delivery item management
 * - Background sync when online
 */

'use client';

import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { LMDRecord, LMDDeliveryItem } from '@/lib/indexeddb';

interface LMDDeliveryTrackerProps {
  facilityId: string;
  facilityName: string;
  lgaCode: string;
  stateCode: string;
  officerId: string;
  officerName: string;
  onComplete?: (record: LMDRecord) => void;
}

export function LMDDeliveryTracker({
  facilityId,
  facilityName,
  lgaCode,
  stateCode,
  officerId,
  officerName,
  onComplete,
}: LMDDeliveryTrackerProps) {
  const { stats, isOnline, addRecord, syncNow, isLoading } = useOfflineSync();
  
  const [vvmStatus, setVVMStatus] = useState<'OK' | 'WARNING' | 'CRITICAL' | 'NOT_TESTED'>('NOT_TESTED');
  const [gpsLocation, setGPSLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [deliveryItems, setDeliveryItems] = useState<LMDDeliveryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current GPS location
  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGPSLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (err) => {
          console.error('GPS error:', err);
          setError('Failed to get GPS location. Please enable location services.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };

  // Add a delivery item
  const addDeliveryItem = () => {
    const newItem: LMDDeliveryItem = {
      productCode: '',
      productName: '',
      quantityDelivered: 0,
      quantityReceived: 0,
      batchNumber: '',
      expiryDate: '',
      vvmStatus: 'NOT_TESTED',
      coldChainBreak: false,
      notes: '',
    };
    setDeliveryItems([...deliveryItems, newItem]);
  };

  // Update a delivery item
  const updateDeliveryItem = (index: number, field: keyof LMDDeliveryItem, value: any) => {
    const updatedItems = [...deliveryItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setDeliveryItems(updatedItems);
  };

  // Remove a delivery item
  const removeDeliveryItem = (index: number) => {
    setDeliveryItems(deliveryItems.filter((_, i) => i !== index));
  };

  // Submit the delivery record
  const handleSubmit = async () => {
    if (deliveryItems.length === 0) {
      setError('Please add at least one delivery item.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const record: Partial<LMDRecord> = {
        facilityId,
        facilityName,
        lgaCode,
        stateCode,
        deliveryTimestamp: new Date().toISOString(),
        vvmStatus,
        vehicleGPS: gpsLocation ? {
          ...gpsLocation,
          timestamp: new Date().toISOString(),
        } : undefined,
        deliveryItems,
        officerId,
        officerName,
      };

      await addRecord(record);
      setSuccess(true);
      
      // Trigger sync if online
      if (isOnline) {
        await syncNow();
      }

      // Call completion callback
      if (onComplete) {
        onComplete(record as LMDRecord);
      }

      // Reset form after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setDeliveryItems([]);
        setVVMStatus('NOT_TESTED');
        setGPSLocation(null);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delivery record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Last-Mile Delivery Tracker</h2>
        <p className="text-gray-600">{facilityName}</p>
        
        {/* Connection Status */}
        <div className="mt-2 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isOnline ? 'Online' : 'Offline - Data will be saved locally'}
          </span>
        </div>
        
        {/* Pending Sync Count */}
        {stats && stats.pendingSync > 0 && (
          <div className="mt-2 text-sm text-amber-600">
            {stats.pendingSync} record(s) pending sync
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          ✓ Delivery record saved successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* VVM Status */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          VVM Status (Vaccine Vial Monitor)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['OK', 'WARNING', 'CRITICAL', 'NOT_TESTED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setVVMStatus(status)}
              className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                vvmStatus === status
                  ? status === 'OK'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : status === 'WARNING'
                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                    : status === 'CRITICAL'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-500 bg-gray-50 text-gray-700'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* GPS Location */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          GPS Location
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="w-full p-3 bg-blue-50 border border-blue-300 rounded-lg text-blue-700 font-medium hover:bg-blue-100 transition-colors"
        >
          {gpsLocation
            ? `📍 ${gpsLocation.latitude.toFixed(6)}, ${gpsLocation.longitude.toFixed(6)} (±${gpsLocation.accuracy.toFixed(0)}m)`
            : '📍 Capture Current Location'}
        </button>
      </div>

      {/* Delivery Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Delivery Items
          </label>
          <button
            type="button"
            onClick={addDeliveryItem}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Item
          </button>
        </div>

        {deliveryItems.length === 0 ? (
          <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center text-gray-500">
            No delivery items added yet
          </div>
        ) : (
          <div className="space-y-4">
            {deliveryItems.map((item, index) => (
              <div key={index} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-gray-800">Item {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeDeliveryItem(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => updateDeliveryItem(index, 'productName', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="e.g., BCG Vaccine"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Product Code</label>
                    <input
                      type="text"
                      value={item.productCode}
                      onChange={(e) => updateDeliveryItem(index, 'productCode', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="e.g., BCG-10VIAL"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Qty Delivered</label>
                    <input
                      type="number"
                      value={item.quantityDelivered}
                      onChange={(e) => updateDeliveryItem(index, 'quantityDelivered', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Qty Received</label>
                    <input
                      type="number"
                      value={item.quantityReceived}
                      onChange={(e) => updateDeliveryItem(index, 'quantityReceived', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={item.batchNumber}
                      onChange={(e) => updateDeliveryItem(index, 'batchNumber', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                      placeholder="e.g., B123456"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateDeliveryItem(index, 'expiryDate', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.coldChainBreak}
                      onChange={(e) => updateDeliveryItem(index, 'coldChainBreak', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Cold Chain Break</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting || deliveryItems.length === 0}
        className={`w-full p-4 rounded-lg font-medium text-white transition-colors ${
          isSubmitting || deliveryItems.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isSubmitting ? 'Saving...' : isOnline ? 'Save & Sync Delivery Record' : 'Save Delivery Record (Offline)'}
      </button>
    </div>
  );
}
