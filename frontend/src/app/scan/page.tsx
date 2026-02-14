'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { QRDeliveryScanner } from '@/components/mobile/QRDeliveryScanner';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ScanResult {
  success: boolean;
  batchNumber?: string;
  productName?: string;
  quantity?: number;
  facility?: string;
  error?: string;
}

export default function ScanPage() {
  const router = useRouter();
  const { userSession } = useVaxTraceStore();
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!userSession?.isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleScanSuccess = async (data: any) => {
    setIsProcessing(true);
    try {
      // Parse QR code data (format: vaxtrace://batch/{batchNumber}/{facilityCode})
      const url = new URL(data);
      if (url.protocol !== 'vaxtrace:') {
        throw new Error('Invalid VaxTrace QR code');
      }

      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts[0] !== 'batch' || pathParts.length < 3) {
        throw new Error('Invalid QR code format');
      }

      const batchNumber = pathParts[1];
      const facilityCode = pathParts[2];

      // Call backend API to verify and get delivery details
      const response = await fetch('/api/v1/delivery/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCodeId: `${batchNumber}/${facilityCode}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify QR code with backend');
      }

      const result = await response.json();

      // Transform backend response to scan result format
      const scanResult: ScanResult = {
        success: result.success || true,
        batchNumber,
        productName: result.data?.productName || 'Unknown Vaccine',
        quantity: result.data?.quantity || 0,
        facility: result.data?.facilityName || facilityCode,
      };

      setScanResult(scanResult);
    } catch (error) {
      setScanResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process QR code',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliveryConfirmation = async (vvmStage: number, temperature: number) => {
    setIsProcessing(true);
    try {
      // Submit delivery confirmation to backend API
      const response = await fetch('/api/v1/delivery/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qrCodeId: `${scanResult?.batchNumber}/${scanResult?.facility}`,
          vvmStage,
          temperature,
          notes: `Delivery confirmed via QR scan`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm delivery with backend');
      }

      const result = await response.json();

      // Show success and reset
      alert(`Delivery confirmed!\nVVM Stage: ${vvmStage}\nTemperature: ${temperature}°C\nConfirmation ID: ${result.confirmationId || 'N/A'}`);
      setScanResult(null);
    } catch (error) {
      alert(`Failed to confirm delivery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <h1 className="text-lg font-semibold">Scan Delivery</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4">
        {scanResult === null ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Scan QR Code</h2>
              <p className="text-sm text-slate-400">
                Point your camera at the delivery QR code to confirm receipt
              </p>
            </div>

            <QRDeliveryScanner
              onDeliveryConfirmed={handleScanSuccess}
              onError={(error) => console.error('Scan error:', error)}
            />

            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">Instructions</h3>
              <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                <li>Ensure you have good lighting</li>
                <li>Hold the device steady</li>
                <li>Align the QR code within the frame</li>
                <li>Wait for automatic scan</li>
                <li>Confirm VVM status and temperature</li>
              </ol>
            </div>
          </div>
        ) : scanResult.success ? (
          <div className="space-y-4">
            {/* Success Result */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-emerald-400 mb-2">Delivery Verified</h2>
              <p className="text-sm text-slate-400">QR code scanned successfully</p>
            </div>

            {/* Delivery Details */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-white mb-3">Delivery Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Batch Number</span>
                  <span className="text-sm text-white font-mono">{scanResult.batchNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Product</span>
                  <span className="text-sm text-white">{scanResult.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Quantity</span>
                  <span className="text-sm text-white">{scanResult.quantity} doses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Destination</span>
                  <span className="text-sm text-white">{scanResult.facility}</span>
                </div>
              </div>
            </div>

            {/* VVM Status Input */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">Cold Chain Verification</h3>
              <p className="text-xs text-slate-400 mb-4">
                Please verify the Vaccine Vial Monitor (VVM) status and temperature
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">VVM Stage</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((stage) => (
                      <button
                        key={stage}
                        onClick={() => handleDeliveryConfirmation(stage, 4)}
                        disabled={isProcessing}
                        className={`py-3 rounded-lg font-medium transition-colors ${
                          stage === 1
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : stage === 2
                            ? 'bg-lime-500 text-white hover:bg-lime-600'
                            : stage === 3
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-rose-500 text-white hover:bg-rose-600'
                        } disabled:opacity-50`}
                      >
                        Stage {stage}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Stage 1: OK | Stage 2: Acceptable | Stage 3: Caution | Stage 4: Reject
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setScanResult(null)}
                disabled={isProcessing}
                className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Scan Another
              </button>
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-center"
              >
                Done
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error Result */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-6 text-center">
              <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-rose-400 mb-2">Scan Failed</h2>
              <p className="text-sm text-slate-400">{scanResult.error}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setScanResult(null)}
                disabled={isProcessing}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="flex-1 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
