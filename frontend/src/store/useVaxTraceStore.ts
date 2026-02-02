/**
 * VaxTrace Nigeria - Global State Management (Zustand)
 * 
 * This store manages the "Global Ticker" and "Crystal Ball" predictive state.
 * It provides a centralized state management solution with:
 * - Real-time data synchronization
 * - Offline-first support with persistence
 * - Optimistic updates for UI responsiveness
 * - Computed selectors for derived state
 * 
 * Features:
 * - Stock data with filtering and aggregation
 * - Alert management with priority sorting
 * - Map state (viewport, selected nodes, filters)
 * - User session and permissions
 * - Predictive insights (Crystal Ball)
 * - Offline status indicator
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export interface VaxTraceStockData {
  nodeId: string;
  facilityName: string;
  facilityCode: string;
  state: string;
  lga: string;
  productCode: string;
  productName: string;
  quantity: number;
  lotCode: string;
  lotExpiry: string;
  expiryRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPIRED';
  vvmStage: number;
  vvmStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  monthsOfStock: number;
  lastUpdated: string;
  stockStatus: 'CRITICAL' | 'LOW' | 'ADEQUATE' | 'OVERSTOCKED';
}

export interface VaxTraceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  facilityId: string;
  facilityName: string;
  state: string;
  lga: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
}

export type AlertType =
  | 'stockout'
  | 'near_expiry'
  | 'temperature_excursion'
  | 'vvm_stage_3'
  | 'vvm_stage_4'
  | 'power_outage'
  | 'delivery_delay';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MapNode {
  id: string;
  label: string;
  code: string;
  state: string;
  lga: string;
  lat: number;
  lng: number;
  nodeType: 'WAREHOUSE' | 'CLINIC' | 'HOSPITAL' | 'PHC';
  hasColdChain: boolean;
  hasRTM: boolean;
  stockStatus: 'OPTIMAL' | 'UNDERSTOCKED' | 'STOCKOUT' | 'OVERSTOCKED';
  alertCount: number;
  lastSync: string;
}

export interface UserSession {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    assignedLocationId?: string;
  };
  permissions: UserPermissions;
  loginTime: string;
}

export type UserRole =
  | 'nphcda_director'
  | 'state_cold_chain_officer'
  | 'lga_logistics_officer'
  | 'facility_in_charge'
  | 'system_admin';

export interface UserPermissions {
  canViewNational: boolean;
  canViewState: boolean;
  canViewLGA: boolean;
  canViewFacility: boolean;
  canEditStock: boolean;
  canEditUsers: boolean;
  canViewReports: boolean;
}

export interface PredictiveInsight {
  id: string;
  facilityId: string;
  facilityName: string;
  productId: string;
  productName: string;
  prediction: string;
  expectedDate: string;
  confidence: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TransferSuggestion {
  id: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  productId: string;
  productName: string;
  suggestedQuantity: number;
  distance: number;
  estimatedTravelTime: number;
  confidence: number;
  createdAt: string;
}

export interface OfflineStatus {
  isOffline: boolean;
  lastSync: string;
  pendingChanges: number;
}

export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface MapFilters {
  state?: string;
  lga?: string;
  facilityType?: string[];
  stockStatus?: string[];
  hasAlerts?: boolean;
}

// ============================================
// STORE STATE
// ============================================

interface VaxTraceState {
  // Stock Data
  stockData: VaxTraceStockData[];
  stockDataLoading: boolean;
  stockDataError: string | null;
  lastStockUpdate: Date | null;

  // Alerts
  alerts: VaxTraceAlert[];
  alertsLoading: boolean;
  alertsError: string | null;
  dismissedAlerts: Set<string>;

  // Map State
  mapNodes: MapNode[];
  mapNodesLoading: boolean;
  mapNodesError: string | null;
  mapViewport: MapViewport;
  mapFilters: MapFilters;
  selectedNode: MapNode | null;

  // User Session
  userSession: UserSession | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  // Predictive Insights (Crystal Ball)
  predictiveInsights: PredictiveInsight[];
  insightsLoading: boolean;

  // Transfer Suggestions
  transferSuggestions: TransferSuggestion[];

  // Offline Status
  offlineStatus: OfflineStatus;

  // UI State
  sidebarOpen: boolean;
  alertPanelOpen: boolean;
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
}

// ============================================
// STORE ACTIONS
// ============================================

interface VaxTraceActions {
  // Stock Data Actions
  setStockData: (data: VaxTraceStockData[]) => void;
  updateStockItem: (id: string, updates: Partial<VaxTraceStockData>) => void;
  clearStockData: () => void;
  fetchStockData: () => Promise<void>;

  // Alert Actions
  setAlerts: (alerts: VaxTraceAlert[]) => void;
  addAlert: (alert: VaxTraceAlert) => void;
  dismissAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  clearAlerts: () => void;
  fetchAlerts: () => Promise<void>;

  // Map Actions
  setMapNodes: (nodes: MapNode[]) => void;
  setMapViewport: (viewport: Partial<MapViewport>) => void;
  setMapFilters: (filters: Partial<MapFilters>) => void;
  setSelectedNode: (node: MapNode | null) => void;
  resetMapFilters: () => void;

  // User Actions
  setUserSession: (session: UserSession) => void;
  logout: () => void;

  // Predictive Insights Actions
  setPredictiveInsights: (insights: PredictiveInsight[]) => void;
  fetchPredictiveInsights: () => Promise<void>;

  // Transfer Suggestions Actions
  setTransferSuggestions: (suggestions: TransferSuggestion[]) => void;
  fetchTransferSuggestions: () => Promise<void>;

  // Offline Actions
  setOfflineStatus: (status: OfflineStatus) => void;

  // UI Actions
  toggleSidebar: () => void;
  toggleAlertPanel: () => void;
  setSelectedTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: VaxTraceState = {
  stockData: [],
  stockDataLoading: false,
  stockDataError: null,
  lastStockUpdate: null,

  alerts: [],
  alertsLoading: false,
  alertsError: null,
  dismissedAlerts: new Set(),

  mapNodes: [],
  mapNodesLoading: false,
  mapNodesError: null,
  mapViewport: {
    center: [8.6753, 9.0820], // Nigeria center
    zoom: 5.5,
    pitch: 0,
    bearing: 0,
  },
  mapFilters: {},
  selectedNode: null,

  userSession: null,
  isAuthenticated: false,
  isAuthenticating: false,

  predictiveInsights: [],
  insightsLoading: false,

  transferSuggestions: [],

  offlineStatus: {
    isOffline: false,
    lastSync: new Date().toISOString(),
    pendingChanges: 0,
  },

  sidebarOpen: true,
  alertPanelOpen: false,
  selectedTimeRange: '30d',
};

// ============================================
// STORE CREATION
// ============================================

export const useVaxTraceStore = create<VaxTraceState & VaxTraceActions>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // Stock Data Actions
        setStockData: (data) =>
          set({
            stockData: data,
            stockDataLoading: false,
            stockDataError: null,
            lastStockUpdate: new Date(),
          }),

        updateStockItem: (id, updates) =>
          set((state) => ({
            stockData: state.stockData.map((item) =>
              item.nodeId === id ? { ...item, ...updates } : item
            ),
          })),

        clearStockData: () =>
          set({
            stockData: [],
            lastStockUpdate: null,
          }),

        // Alert Actions
        setAlerts: (alerts) =>
          set({
            alerts,
            alertsLoading: false,
            alertsError: null,
          }),

        addAlert: (alert) =>
          set((state) => ({
            alerts: [alert, ...state.alerts],
          })),

        dismissAlert: (alertId) =>
          set((state) => {
            const dismissed = new Set(state.dismissedAlerts);
            dismissed.add(alertId);
            return {
              dismissedAlerts: dismissed,
              alerts: state.alerts.filter((a) => a.id !== alertId),
            };
          }),

        resolveAlert: (alertId) =>
          set((state) => ({
            alerts: state.alerts.map((alert) =>
              alert.id === alertId ? { ...alert, isResolved: true } : alert
            ),
          })),

        clearAlerts: () =>
          set({
            alerts: [],
          }),

        // Map Actions
        setMapNodes: (nodes) =>
          set({
            mapNodes: nodes,
            mapNodesLoading: false,
            mapNodesError: null,
          }),

        setMapViewport: (viewport) =>
          set((state) => ({
            mapViewport: { ...state.mapViewport, ...viewport },
          })),

        setMapFilters: (filters) =>
          set((state) => ({
            mapFilters: { ...state.mapFilters, ...filters },
          })),

        setSelectedNode: (node) =>
          set({
            selectedNode: node,
          }),

        resetMapFilters: () =>
          set({
            mapFilters: {},
          }),

        // User Actions
        setUserSession: (session) =>
          set({
            userSession: session,
            isAuthenticated: true,
            isAuthenticating: false,
          }),

        logout: () =>
          set({
            userSession: null,
            isAuthenticated: false,
            stockData: [],
            alerts: [],
            predictiveInsights: [],
          }),

        // Predictive Insights Actions
        setPredictiveInsights: (insights) =>
          set({
            predictiveInsights: insights,
            insightsLoading: false,
          }),

        fetchPredictiveInsights: async () => {
          set({ insightsLoading: true });
          try {
            const response = await fetch('/api/predictive-insights');
            const json = await response.json();
            set({ predictiveInsights: json.data || [], insightsLoading: false });
          } catch (error) {
            set({ insightsLoading: false });
          }
        },

        // Transfer Suggestions Actions
        setTransferSuggestions: (suggestions) =>
          set({
            transferSuggestions: suggestions,
          }),

        fetchTransferSuggestions: async () => {
          try {
            const response = await fetch('/api/transfer-suggestions');
            const json = await response.json();
            set({ transferSuggestions: json.data || [] });
          } catch (error) {
            console.error('Failed to fetch transfer suggestions:', error);
          }
        },

        // Offline Actions
        setOfflineStatus: (status) =>
          set({
            offlineStatus: status,
          }),

        // UI Actions
        toggleSidebar: () =>
          set((state) => ({
            sidebarOpen: !state.sidebarOpen,
          })),

        toggleAlertPanel: () =>
          set((state) => ({
            alertPanelOpen: !state.alertPanelOpen,
          })),

        setSelectedTimeRange: (range) =>
          set({
            selectedTimeRange: range,
          }),

        // Fetch Methods
        fetchStockData: async () => {
          set({ stockDataLoading: true });
          try {
            const response = await fetch('/api/stock');
            const json = await response.json();
            set({ stockData: json.data || [], stockDataLoading: false, lastStockUpdate: new Date() });
          } catch (error) {
            set({ stockDataLoading: false, stockDataError: 'Failed to fetch stock data' });
          }
        },

        fetchAlerts: async () => {
          set({ alertsLoading: true });
          try {
            const response = await fetch('/api/alerts');
            const json = await response.json();
            set({ alerts: json.data || [], alertsLoading: false });
          } catch (error) {
            set({ alertsLoading: false, alertsError: 'Failed to fetch alerts' });
          }
        },
      }),
      {
        name: 'vaxtrace-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist these fields
          userSession: state.userSession,
          dismissedAlerts: Array.from(state.dismissedAlerts),
          mapViewport: state.mapViewport,
          mapFilters: state.mapFilters,
          sidebarOpen: state.sidebarOpen,
          selectedTimeRange: state.selectedTimeRange,
        }),
      }
    )
  )
);

// ============================================
// SELECTORS (Computed State)
// ============================================

/**
 * Get critical alerts only
 */
export const selectCriticalAlerts = (state: VaxTraceState) =>
  state.alerts.filter((a) => a.severity === 'critical' && !a.isResolved);

/**
 * Get alerts count by severity
 */
export const selectAlertsCount = (state: VaxTraceState) => ({
  critical: state.alerts.filter((a) => a.severity === 'critical' && !a.isResolved).length,
  high: state.alerts.filter((a) => a.severity === 'high' && !a.isResolved).length,
  medium: state.alerts.filter((a) => a.severity === 'medium' && !a.isResolved).length,
  low: state.alerts.filter((a) => a.severity === 'low' && !a.isResolved).length,
});

/**
 * Get filtered stock data based on map filters
 */
export const selectFilteredStockData = (state: VaxTraceState) => {
  let data = state.stockData;

  if (state.mapFilters.state) {
    data = data.filter((item) => item.state === state.mapFilters.state);
  }

  if (state.mapFilters.lga) {
    data = data.filter((item) => item.lga === state.mapFilters.lga);
  }

  if (state.mapFilters.stockStatus && state.mapFilters.stockStatus.length > 0) {
    data = data.filter((item) => state.mapFilters.stockStatus!.includes(item.vvmStatus));
  }

  return data;
};

/**
 * Get high-priority predictive insights
 */
export const selectPriorityInsights = (state: VaxTraceState) =>
  state.predictiveInsights.filter((insight) =>
    ['CRITICAL', 'HIGH'].includes(insight.riskLevel)
  );

/**
 * Get stockout facilities
 */
export const selectStockoutFacilities = (state: VaxTraceState) => {
  const stockoutMap = new Map<string, VaxTraceStockData[]>();

  state.stockData.forEach((item) => {
    if (item.quantity === 0) {
      const facilities = stockoutMap.get(item.state) || [];
      facilities.push(item);
      stockoutMap.set(item.state, facilities);
    }
  });

  return stockoutMap;
};

/**
 * Get national stock summary
 */
export const selectNationalStockSummary = (state: VaxTraceState) => {
  const summary = {
    totalFacilities: new Set(state.stockData.map((s) => s.nodeId)).size,
    totalStock: state.stockData.reduce((sum, s) => sum + s.quantity, 0),
    stockouts: state.stockData.filter((s) => s.quantity === 0).length,
    critical: state.stockData.filter((s) => s.vvmStatus === 'CRITICAL').length,
    warning: state.stockData.filter((s) => s.vvmStatus === 'WARNING').length,
    optimal: state.stockData.filter((s) => s.vvmStatus === 'HEALTHY').length,
  };

  return summary;
};

// ============================================
// HOOKS
// ============================================

/**
 * Hook for stock data with filters
 */
export const useStockData = () => {
  const stockData = useVaxTraceStore((state) => state.stockData);
  const loading = useVaxTraceStore((state) => state.stockDataLoading);
  const error = useVaxTraceStore((state) => state.stockDataError);
  const filters = useVaxTraceStore((state) => state.mapFilters);
  const setStockData = useVaxTraceStore((state) => state.setStockData);

  const filteredData = useVaxTraceStore(selectFilteredStockData);

  return {
    stockData,
    filteredData,
    loading,
    error,
    filters,
    setStockData,
  };
};

/**
 * Hook for alerts
 */
export const useAlerts = () => {
  const alerts = useVaxTraceStore((state) => state.alerts);
  const loading = useVaxTraceStore((state) => state.alertsLoading);
  const criticalAlerts = useVaxTraceStore(selectCriticalAlerts);
  const alertsCount = useVaxTraceStore(selectAlertsCount);
  const dismissAlert = useVaxTraceStore((state) => state.dismissAlert);
  const resolveAlert = useVaxTraceStore((state) => state.resolveAlert);

  return {
    alerts,
    loading,
    criticalAlerts,
    alertsCount,
    dismissAlert,
    resolveAlert,
  };
};

/**
 * Hook for map state
 */
export const useMapState = () => {
  const nodes = useVaxTraceStore((state) => state.mapNodes);
  const viewport = useVaxTraceStore((state) => state.mapViewport);
  const filters = useVaxTraceStore((state) => state.mapFilters);
  const selectedNode = useVaxTraceStore((state) => state.selectedNode);
  const loading = useVaxTraceStore((state) => state.mapNodesLoading);

  const setViewport = useVaxTraceStore((state) => state.setMapViewport);
  const setFilters = useVaxTraceStore((state) => state.setMapFilters);
  const setSelectedNode = useVaxTraceStore((state) => state.setSelectedNode);
  const resetFilters = useVaxTraceStore((state) => state.resetMapFilters);

  return {
    nodes,
    viewport,
    filters,
    selectedNode,
    loading,
    setViewport,
    setFilters,
    setSelectedNode,
    resetFilters,
  };
};

/**
 * Hook for user session
 */
export const useUserSession = () => {
  const session = useVaxTraceStore((state) => state.userSession);
  const isAuthenticated = useVaxTraceStore((state) => state.isAuthenticated);
  const isAuthenticating = useVaxTraceStore((state) => state.isAuthenticating);

  const setSession = useVaxTraceStore((state) => state.setUserSession);
  const logout = useVaxTraceStore((state) => state.logout);

  return {
    session,
    isAuthenticated,
    isAuthenticating,
    setSession,
    logout,
  };
};

/**
 * Hook for predictive insights
 */
export const usePredictiveInsights = () => {
  const insights = useVaxTraceStore((state) => state.predictiveInsights);
  const loading = useVaxTraceStore((state) => state.insightsLoading);
  const priorityInsights = useVaxTraceStore(selectPriorityInsights);

  const setInsights = useVaxTraceStore((state) => state.setPredictiveInsights);

  return {
    insights,
    loading,
    priorityInsights,
    setInsights,
  };
};

/**
 * Hook for offline status
 */
export const useOfflineStatus = () => {
  const offlineStatus = useVaxTraceStore((state) => state.offlineStatus);
  const setOfflineStatus = useVaxTraceStore((state) => state.setOfflineStatus);

  return {
    offlineStatus,
    setOfflineStatus,
  };
};
