'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import {
  ArrowLeft,
  MapPin,
  Thermometer,
  Package,
  AlertTriangle,
  Clock,
  Activity,
  Truck,
  Phone,
  User,
  Calendar,
} from 'lucide-react';
import { formatDate, formatDateTime, getStockStatusColor, getVVMStageColor, getExpiryRisk } from '@/lib/utils';

interface FacilityDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  state: string;
  lga: string;
  ward: string;
  address: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  catchmentPopulation: number;
  hasColdChain: boolean;
  hasGenerator: boolean;
  hasSolar: boolean;
  inCharge: string;
  stockData: Array<{
    productName: string;
    stockStatus: string;
    quantity: number;
    mos: number;
    expiryDate: string;
    vvmStage: number;
    batchNumber: string;
  }>;
  cceData: Array<{
    equipmentType: string;
    model: string;
    serialNumber: string;
    currentTemp: number;
    minTemp: number;
    maxTemp: number;
    status: string;
    lastMaintenance: string;
  }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    createdAt: string;
  }>;
}

export default function FacilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params.id as string;
  const { userSession } = useVaxTraceStore();
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchFacilityDetail();
  }, [facilityId, userSession]);

  const fetchFacilityDetail = async () => {
    setIsLoading(true);
    try {
      // In production, this would fetch from the API
      // For now, using mock data
      const mockFacility: FacilityDetail = {
        id: facilityId,
        name: 'Primary Health Center Kano',
        code: 'PHC-KANO-001',
        type: 'Primary Health Center',
        state: 'Kano',
        lga: 'Kano Municipal',
        ward: 'Kofar Dan Agundi',
        address: 'No 1, Emir Road, Kano',
        phone: '+234 803 456 7890',
        email: 'phc-kano001@health.gov.ng',
        latitude: 12.0022,
        longitude: 8.5919,
        catchmentPopulation: 25000,
        hasColdChain: true,
        hasGenerator: true,
        hasSolar: false,
        inCharge: 'Dr. Amina Ibrahim',
        stockData: [
          {
            productName: 'BCG',
            stockStatus: 'ADEQUATE',
            quantity: 500,
            mos: 4.2,
            expiryDate: '2025-06-15',
            vvmStage: 2,
            batchNumber: 'BCG-2024-001',
          },
          {
            productName: 'OPV',
            stockStatus: 'LOW',
            quantity: 200,
            mos: 1.8,
            expiryDate: '2025-04-20',
            vvmStage: 2,
            batchNumber: 'OPV-2024-003',
          },
          {
            productName: 'Pentavalent',
            stockStatus: 'CRITICAL',
            quantity: 50,
            mos: 0.5,
            expiryDate: '2025-03-10',
            vvmStage: 3,
            batchNumber: 'PENTA-2024-002',
          },
          {
            productName: 'PCV',
            stockStatus: 'ADEQUATE',
            quantity: 800,
            mos: 5.5,
            expiryDate: '2025-08-30',
            vvmStage: 1,
            batchNumber: 'PCV-2024-001',
          },
        ],
        cceData: [
          {
            equipmentType: 'Solar Refrigerator',
            model: 'SDDPlus',
            serialNumber: 'SDD-2023-4567',
            currentTemp: 3.5,
            minTemp: 2,
            maxTemp: 8,
            status: 'OPERATIONAL',
            lastMaintenance: '2024-01-15',
          },
          {
            equipmentType: 'Ice-lined Refrigerator',
            model: 'ILR-300',
            serialNumber: 'ILR-2022-1234',
            currentTemp: 4.2,
            minTemp: 2,
            maxTemp: 8,
            status: 'OPERATIONAL',
            lastMaintenance: '2023-11-20',
          },
        ],
        alerts: [
          {
            id: 'alert-1',
            type: 'STOCKOUT',
            severity: 'CRITICAL',
            message: 'Pentavalent stock below 1 month supply',
            createdAt: '2025-01-30T10:30:00Z',
          },
          {
            id: 'alert-2',
            type: 'EXPIRY',
            severity: 'HIGH',
            message: 'Pentavalent batch PENTA-2024-002 expiring in 40 days',
            createdAt: '2025-01-28T14:20:00Z',
          },
        ],
      };
      setFacility(mockFacility);
    } catch (error) {
      console.error('Error fetching facility detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading facility details...</p>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Facility Not Found</h1>
          <Link href="/dashboard" className="text-emerald-400 hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">{facility.name}</h1>
              <p className="text-xs text-slate-500">{facility.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">{facility.type}</span>
            <span className="text-slate-600">•</span>
            <span className="text-sm text-slate-400">{facility.state}</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4 space-y-4">
        {/* Facility Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Facility Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">State</p>
                <p className="text-sm text-white">{facility.state}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">LGA</p>
                <p className="text-sm text-white">{facility.lga}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Ward</p>
                <p className="text-sm text-white">{facility.ward}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Address</p>
                <p className="text-sm text-white">{facility.address}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Phone</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <Phone className="w-3 h-3" />
                  {facility.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm text-white">{facility.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">In Charge</p>
                <p className="text-sm text-white flex items-center gap-2">
                  <User className="w-3 h-3" />
                  {facility.inCharge}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Catchment Population</p>
                <p className="text-sm text-white">{facility.catchmentPopulation.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Infrastructure */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Infrastructure
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Cold Chain Equipment</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    facility.hasColdChain ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {facility.hasColdChain ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Generator</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    facility.hasGenerator ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {facility.hasGenerator ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Solar Power</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    facility.hasSolar ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {facility.hasSolar ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Coordinates</p>
              <p className="text-sm text-slate-300">
                {facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Data */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Stock Status
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">MOS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">VVM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Batch</th>
                </tr>
              </thead>
              <tbody>
                {facility.stockData.map((stock, index) => (
                  <tr key={index} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-sm text-white">{stock.productName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getStockStatusColor(stock.stockStatus)}`}
                      >
                        {stock.stockStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">{stock.quantity}</td>
                    <td className="px-4 py-3 text-sm text-white">{stock.mos.toFixed(1)} months</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{formatDate(stock.expiryDate)}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            getExpiryRisk(stock.expiryDate) === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-400'
                              : getExpiryRisk(stock.expiryDate) === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {getExpiryRisk(stock.expiryDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${getVVMStageColor(stock.vvmStage)}`}>
                        Stage {stock.vvmStage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{stock.batchNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cold Chain Equipment */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-cyan-400" />
            Cold Chain Equipment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facility.cceData.map((cce, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-white">{cce.equipmentType}</h3>
                    <p className="text-xs text-slate-500">{cce.model}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      cce.status === 'OPERATIONAL'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {cce.status}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Serial Number</span>
                    <span className="text-xs text-slate-300">{cce.serialNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Current Temperature</span>
                    <span
                      className={`text-xs font-medium ${
                        cce.currentTemp >= cce.minTemp && cce.currentTemp <= cce.maxTemp
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {cce.currentTemp}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Safe Range</span>
                    <span className="text-xs text-slate-300">
                      {cce.minTemp}°C - {cce.maxTemp}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Last Maintenance</span>
                    <span className="text-xs text-slate-300">{formatDate(cce.lastMaintenance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        {facility.alerts.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Active Alerts
            </h2>
            <div className="space-y-3">
              {facility.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${
                    alert.severity === 'CRITICAL'
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : alert.severity === 'HIGH'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-slate-700 bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">{alert.type}</span>
                    <span className="text-xs text-slate-500">{formatDateTime(alert.createdAt)}</span>
                  </div>
                  <p className="text-sm text-white">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/facility/${facilityId}/requisition`}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            Create Requisition
          </Link>
          <Link
            href={`/facility/${facilityId}/transfer`}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Request Transfer
          </Link>
          <Link
            href={`/facility/${facilityId}/history`}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            View History
          </Link>
        </div>
      </main>
    </div>
  );
}
