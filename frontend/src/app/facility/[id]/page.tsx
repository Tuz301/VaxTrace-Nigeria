'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useVaxTraceStore } from '@/store/useVaxTraceStore';
import { useMapContext } from '@/contexts/MapContext';
import { FacilityViewMap } from '@/components/map/LocationMap';
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
import { formatDate, formatDateTime, getStockStatusColor, getVVMStageColor, getExpiryRisk, getExpiryRiskColor } from '@/lib/utils';

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
  const { selectFacility } = useMapContext();
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userSession?.isAuthenticated) {
      router.push('/login');
      return;
    }

    // Select the facility in the map context
    selectFacility(facilityId);

    fetchFacilityDetail();
  }, [facilityId, userSession, selectFacility]);

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
              href={`/lga/${facility.lga.toLowerCase().replace(/\s+/g, '-')}`}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-white">{facility.name}</h1>
              <p className="text-xs text-slate-500">{facility.code} • {facility.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-4 h-4" />
            {facility.lga}, {facility.state}
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto p-4 space-y-4">
        {/* Facility Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm text-white">{facility.address}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ward</p>
                <p className="text-sm text-white">{facility.ward}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">LGA</p>
                <p className="text-sm text-white">{facility.lga}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">State</p>
                <p className="text-sm text-white">{facility.state}</p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm text-white">{facility.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm text-white">{facility.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">In Charge</p>
                <p className="text-sm text-white">{facility.inCharge}</p>
              </div>
            </div>
          </div>

          {/* Infrastructure */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Infrastructure
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Cold Chain</span>
                <span className={`text-sm font-medium ${facility.hasColdChain ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {facility.hasColdChain ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Generator</span>
                <span className={`text-sm font-medium ${facility.hasGenerator ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {facility.hasGenerator ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Solar</span>
                <span className={`text-sm font-medium ${facility.hasSolar ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {facility.hasSolar ? 'Available' : 'Not Available'}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500">Catchment Population</p>
                <p className="text-sm text-white">{facility.catchmentPopulation.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {facility.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2 rounded border ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 border-rose-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <p className="text-xs text-white">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(alert.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" />
                  Location Map
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {facility.address}
                </p>
              </div>
              <FacilityViewMap height="300px" className="w-full" />
            </div>
          </div>

          {/* Cold Chain Equipment */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-cyan-400" />
              Cold Chain Equipment
            </h2>
            <div className="space-y-3">
              {facility.cceData.map((cce, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white">{cce.equipmentType}</p>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        cce.status === 'OPERATIONAL'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {cce.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Model</span>
                      <span className="text-white">{cce.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Serial No.</span>
                      <span className="text-white">{cce.serialNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Temp</span>
                      <span className="text-white">{cce.currentTemp}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Range</span>
                      <span className="text-white">{cce.minTemp}°C - {cce.maxTemp}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Last Maintenance</span>
                      <span className="text-white">{formatDate(cce.lastMaintenance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Data Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Vaccine Stock Levels
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">MoS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">VVM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {facility.stockData.map((stock, index) => (
                  <tr key={index} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{stock.productName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStockStatusColor(
                          stock.stockStatus
                        )}`}
                      >
                        {stock.stockStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{stock.quantity} doses</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{stock.mos} months</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getVVMStageColor(
                          stock.vvmStage
                        )}`}
                      >
                        Stage {stock.vvmStage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{formatDate(stock.expiryDate)}</div>
                      <div className={`text-xs ${getExpiryRiskColor(stock.expiryDate)}`}>
                        {getExpiryRisk(stock.expiryDate) === 'CRITICAL' ? 'Expiring Soon' :
                         getExpiryRisk(stock.expiryDate) === 'HIGH' ? 'Check Expiry' : 'OK'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">{stock.batchNumber}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
