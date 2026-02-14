/**
 * VaxTrace Nigeria - Crystal Ball Prediction Algorithms
 *
 * Phase 1: Rule-Based Foundation
 * Implements deterministic algorithms for vaccine supply chain predictions:
 * - Stockout Prediction (< 7 days, 7-14 days, > 14 days)
 * - Expiry Risk Calculation
 * - Cold Chain Capacity Prediction
 * - Confidence Scoring
 *
 * @author VaxTrace Team
 * @version 1.0.0
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface StockData {
  currentStock: number;
  avgDailyConsumption: number;
  historicalDataQuality: number; // 0-1 scale, 1 = excellent
  minStockThreshold?: number;
}

export interface ExpiryData {
  totalDoses: number;
  expiringDoses: number;
  daysUntilExpiry: number;
  avgDailyConsumption: number;
}

export interface ColdChainData {
  currentStock: number;
  maxCapacity: number;
  avgIncomingShipments: number;
  seasonalityFactor: number; // 0.5-2.0, 1.0 = normal
  currentTemperature?: number;
  maxSafeTemperature?: number;
}

export interface PredictionResult {
  prediction: string;
  expectedDate: string;
  confidence: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  daysUntilEvent: number;
  metrics: {
    [key: string]: number | string;
  };
}

export interface HistoricalDataPoint {
  date: Date;
  consumption: number;
  stock: number;
  wastage: number;
}

// ============================================
// CONSTANTS
// ============================================

const RISK_THRESHOLDS = {
  STOCKOUT_CRITICAL_DAYS: 7,
  STOCKOUT_HIGH_DAYS: 14,
  EXPIRY_RISK_CRITICAL: 20, // percentage
  EXPIRY_RISK_HIGH: 10,
  COLD_CHAIN_CAPACITY_CRITICAL: 90, // percentage
  COLD_CHAIN_CAPACITY_HIGH: 80,
  MIN_CONFIDENCE: 70,
  MAX_CONFIDENCE: 95,
} as const;

// ============================================
// STOCKOUT PREDICTION ALGORITHM
// ============================================

/**
 * Calculates days until stockout based on current stock and consumption rate
 * Formula: days_until_stockout = current_stock / avg_daily_consumption
 * Confidence: min(95, 70 + (historical_data_quality * 25))
 */
export function calculateStockoutPrediction(data: StockData): PredictionResult {
  const {
    currentStock,
    avgDailyConsumption,
    historicalDataQuality,
    minStockThreshold = 0,
  } = data;

  // Guard against division by zero
  const safeConsumption = avgDailyConsumption > 0 ? avgDailyConsumption : 0.1;

  // Calculate days until stockout
  const daysUntilStockout = Math.floor(currentStock / safeConsumption);

  // Calculate confidence based on historical data quality
  const confidence = Math.min(
    RISK_THRESHOLDS.MAX_CONFIDENCE,
    RISK_THRESHOLDS.MIN_CONFIDENCE + (historicalDataQuality * 25)
  );

  // Determine risk level based on days until stockout
  let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  let prediction: string;

  if (daysUntilStockout <= RISK_THRESHOLDS.STOCKOUT_CRITICAL_DAYS) {
    riskLevel = 'CRITICAL';
    prediction = `CRITICAL: Stock will be depleted in ${daysUntilStockout} day${daysUntilStockout !== 1 ? 's' : ''}. Immediate replenishment required.`;
  } else if (daysUntilStockout <= RISK_THRESHOLDS.STOCKOUT_HIGH_DAYS) {
    riskLevel = 'HIGH';
    prediction = `HIGH ALERT: Stock will be depleted in ${daysUntilStockout} days. Plan replenishment within ${Math.ceil(daysUntilStockout / 2)} days.`;
  } else {
    riskLevel = 'MEDIUM';
    prediction = `Monitor: Stock sufficient for ${daysUntilStockout} days. Review consumption trends in ${daysUntilStockout - 7} days.`;
  }

  // Calculate expected date of stockout
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + daysUntilStockout);

  return {
    prediction,
    expectedDate: expectedDate.toISOString(),
    confidence: Math.round(confidence),
    riskLevel,
    daysUntilEvent: daysUntilStockout,
    metrics: {
      currentStock,
      avgDailyConsumption: safeConsumption,
      daysUntilStockout,
      historicalDataQuality: Math.round(historicalDataQuality * 100) + '%',
    },
  };
}

/**
 * Batch stockout prediction for multiple products
 */
export function calculateMultipleStockoutPredictions(
  items: Array<{ id: string; name: string; data: StockData }>
): Array<{ id: string; name: string } & PredictionResult> {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    ...calculateStockoutPrediction(item.data),
  }));
}

// ============================================
// EXPIRY RISK ALGORITHM
// ============================================

/**
 * Calculates expiry risk and triggers alerts
 * Formula: wastage_risk = (expiring_doses / total_doses) * 100
 * Alert if wastage_risk > 20%
 */
export function calculateExpiryRisk(data: ExpiryData): PredictionResult {
  const {
    totalDoses,
    expiringDoses,
    daysUntilExpiry,
    avgDailyConsumption,
  } = data;

  // Calculate wastage risk percentage
  const wastageRisk = totalDoses > 0 ? (expiringDoses / totalDoses) * 100 : 0;

  // Calculate how many doses can be used before expiry
  const dosesUsableBeforeExpiry = Math.max(0, daysUntilExpiry * avgDailyConsumption);
  const potentialWastage = Math.max(0, expiringDoses - dosesUsableBeforeExpiry);

  // Calculate confidence based on data completeness
  const confidence = Math.min(
    RISK_THRESHOLDS.MAX_CONFIDENCE,
    RISK_THRESHOLDS.MIN_CONFIDENCE + 20
  );

  // Determine risk level
  let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  let prediction: string;

  if (wastageRisk > RISK_THRESHOLDS.EXPIRY_RISK_CRITICAL || daysUntilExpiry <= 7) {
    riskLevel = 'CRITICAL';
    prediction = `CRITICAL: ${expiringDoses} doses (${wastageRisk.toFixed(1)}%) expire in ${daysUntilExpiry} days. Potential wastage: ${potentialWastage} doses. Immediate redistribution required.`;
  } else if (wastageRisk > RISK_THRESHOLDS.EXPIRY_RISK_HIGH || daysUntilExpiry <= 14) {
    riskLevel = 'HIGH';
    prediction = `HIGH ALERT: ${expiringDoses} doses (${wastageRisk.toFixed(1)}%) expire in ${daysUntilExpiry} days. Potential wastage: ${potentialWastage} doses. Accelerate consumption.`;
  } else if (wastageRisk > 5) {
    riskLevel = 'MEDIUM';
    prediction = `Monitor: ${expiringDoses} doses (${wastageRisk.toFixed(1)}%) expire in ${daysUntilExpiry} days. Plan redistribution to higher-demand facilities.`;
  } else {
    riskLevel = 'LOW';
    prediction = `Low risk: ${expiringDoses} doses expire in ${daysUntilExpiry} days. Normal consumption should prevent wastage.`;
  }

  // Calculate expected expiry date
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + daysUntilExpiry);

  return {
    prediction,
    expectedDate: expectedDate.toISOString(),
    confidence: Math.round(confidence),
    riskLevel,
    daysUntilEvent: daysUntilExpiry,
    metrics: {
      totalDoses,
      expiringDoses,
      wastageRisk: wastageRisk.toFixed(1) + '%',
      daysUntilExpiry,
      dosesUsableBeforeExpiry: Math.round(dosesUsableBeforeExpiry),
      potentialWastage: Math.round(potentialWastage),
    },
  };
}

// ============================================
// COLD CHAIN CAPACITY ALGORITHM
// ============================================

/**
 * Calculates cold chain capacity utilization and predicts breaches
 * Formula: capacity_utilization = (current_stock / max_capacity) * 100
 * Alert if capacity_utilization + predicted_influx > 90%
 */
export function calculateColdChainRisk(data: ColdChainData): PredictionResult {
  const {
    currentStock,
    maxCapacity,
    avgIncomingShipments,
    seasonalityFactor,
    currentTemperature,
    maxSafeTemperature = 8,
  } = data;

  // Calculate current capacity utilization
  const capacityUtilization = (currentStock / maxCapacity) * 100;

  // Calculate predicted influx
  const predictedInflux = avgIncomingShipments * seasonalityFactor;

  // Calculate total projected utilization
  const projectedUtilization = capacityUtilization + (predictedInflux / maxCapacity) * 100;

  // Calculate confidence based on data quality
  const confidence = Math.min(
    RISK_THRESHOLDS.MAX_CONFIDENCE,
    RISK_THRESHOLDS.MIN_CONFIDENCE + 15
  );

  // Determine risk level
  let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  let prediction: string;
  let daysUntilEvent = 30; // Default projection period

  // Temperature breach check
  const temperatureBreach = currentTemperature && maxSafeTemperature && currentTemperature > maxSafeTemperature;

  if (projectedUtilization > RISK_THRESHOLDS.COLD_CHAIN_CAPACITY_CRITICAL || temperatureBreach) {
    riskLevel = 'CRITICAL';
    const excessPercentage = projectedUtilization - 100;
    prediction = temperatureBreach
      ? `CRITICAL: TEMPERATURE BREACH! Current: ${currentTemperature}°C exceeds safe limit of ${maxSafeTemperature}°C. Immediate action required.`
      : `CRITICAL: Capacity will be exceeded by ${excessPercentage.toFixed(1)}%. Current: ${capacityUtilization.toFixed(1)}%, Projected: ${projectedUtilization.toFixed(1)}%. Immediate expansion or redistribution required.`;
  } else if (projectedUtilization > RISK_THRESHOLDS.COLD_CHAIN_CAPACITY_HIGH) {
    riskLevel = 'HIGH';
    prediction = `HIGH ALERT: Capacity at ${capacityUtilization.toFixed(1)}%, projected to reach ${projectedUtilization.toFixed(1)}%. Prepare for incoming ${predictedInflux.toFixed(0)} doses. Plan secondary storage.`;
  } else if (capacityUtilization > 70) {
    riskLevel = 'MEDIUM';
    prediction = `Monitor: Capacity at ${capacityUtilization.toFixed(1)}%. Projected influx of ${predictedInflux.toFixed(0)} doses may strain storage. Review upcoming deliveries.`;
  } else {
    riskLevel = 'LOW';
    prediction = `Normal: Capacity at ${capacityUtilization.toFixed(1)}%. Sufficient room for ${predictedInflux.toFixed(0)} projected incoming doses.`;
  }

  // Calculate expected date for capacity breach (if applicable)
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + daysUntilEvent);

  return {
    prediction,
    expectedDate: expectedDate.toISOString(),
    confidence: Math.round(confidence),
    riskLevel,
    daysUntilEvent,
    metrics: {
      currentStock,
      maxCapacity,
      capacityUtilization: capacityUtilization.toFixed(1) + '%',
      avgIncomingShipments,
      seasonalityFactor: seasonalityFactor.toFixed(2),
      projectedUtilization: projectedUtilization.toFixed(1) + '%',
      currentTemperature: currentTemperature ? `${currentTemperature}°C` : 'N/A',
      temperatureBreach: temperatureBreach ? 'YES' : 'NO',
    },
  };
}

// ============================================
// CONFIDENCE SCORING
// ============================================

/**
 * Calculate confidence score based on historical data quality
 * Returns a value between 0-100
 */
export function calculateConfidenceScore(
  historicalDataQuality: number,
  dataPointsCount: number,
  dataRecencyDays: number
): number {
  // Base confidence from data quality (0-1 scale)
  let confidence = RISK_THRESHOLDS.MIN_CONFIDENCE + (historicalDataQuality * 25);

  // Boost for sufficient data points
  if (dataPointsCount >= 30) {
    confidence += 5;
  } else if (dataPointsCount >= 90) {
    confidence += 10;
  }

  // Penalty for stale data
  if (dataRecencyDays > 30) {
    confidence -= 5;
  } else if (dataRecencyDays > 60) {
    confidence -= 10;
  }

  return Math.min(RISK_THRESHOLDS.MAX_CONFIDENCE, Math.max(RISK_THRESHOLDS.MIN_CONFIDENCE, confidence));
}

// ============================================
// ALERT TRIGGER FUNCTIONS
// ============================================

/**
 * Trigger stockout alert based on threshold check
 */
export function triggerStockoutAlert(daysUntilStockout: number, threshold: number): boolean {
  return daysUntilStockout <= threshold;
}

/**
 * Trigger expiry alert based on wastage risk
 */
export function triggerExpiryAlert(wastageRisk: number): boolean {
  return wastageRisk > RISK_THRESHOLDS.EXPIRY_RISK_CRITICAL;
}

/**
 * Trigger cold chain breach alert
 */
export function triggerBreachAlert(capacityUtilization: number, predictedInflux: number): boolean {
  return capacityUtilization + predictedInflux > RISK_THRESHOLDS.COLD_CHAIN_CAPACITY_CRITICAL;
}

// ============================================
// AGGREGATED PREDICTION
// ============================================

/**
 * Generate all predictions for a facility/product combination
 */
export function generateAllPredictions(params: {
  stockData: StockData;
  expiryData: ExpiryData;
  coldChainData: ColdChainData;
}): {
  stockout: PredictionResult;
  expiry: PredictionResult;
  coldChain: PredictionResult;
  overallRiskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
} {
  const stockout = calculateStockoutPrediction(params.stockData);
  const expiry = calculateExpiryRisk(params.expiryData);
  const coldChain = calculateColdChainRisk(params.coldChainData);

  // Determine overall risk level (worst case)
  const riskPriority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const overallRiskLevel = [stockout, expiry, coldChain].sort((a, b) => 
    riskPriority[a.riskLevel] - riskPriority[b.riskLevel]
  )[0].riskLevel;

  return {
    stockout,
    expiry,
    coldChain,
    overallRiskLevel,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate average daily consumption from historical data
 */
export function calculateAverageDailyConsumption(historicalData: HistoricalDataPoint[]): number {
  if (historicalData.length === 0) return 0;

  const totalConsumption = historicalData.reduce((sum, point) => sum + point.consumption, 0);
  const daysCovered = historicalData.length;

  return totalConsumption / daysCovered;
}

/**
 * Calculate historical data quality score (0-1)
 */
export function calculateDataQuality(historicalData: HistoricalDataPoint[]): number {
  if (historicalData.length === 0) return 0;

  let qualityScore = 0.5; // Base score

  // Data completeness
  const hasAllFields = historicalData.every(point => 
    point.consumption >= 0 && point.stock >= 0 && point.wastage >= 0
  );
  if (hasAllFields) qualityScore += 0.2;

  // Data quantity
  if (historicalData.length >= 30) qualityScore += 0.15;
  if (historicalData.length >= 90) qualityScore += 0.15;

  // Data recency (most recent data point within last 7 days)
  const mostRecent = historicalData[historicalData.length - 1];
  const daysSinceLastData = Math.floor(
    (Date.now() - mostRecent.date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceLastData <= 7) qualityScore += 0.1;

  return Math.min(1, qualityScore);
}

/**
 * Determine seasonality factor based on month
 * Higher during vaccination campaign seasons
 */
export function getSeasonalityFactor(month?: number): number {
  const currentMonth = month ?? new Date().getMonth();
  
  // Nigeria-specific seasonality for vaccination
  // Higher demand during dry season (Nov-Mar) and campaign periods
  const seasonalFactors: Record<number, number> = {
    0: 1.2,  // January - New Year campaigns
    1: 1.1,  // February
    2: 1.0,  // March
    3: 0.9,  // April
    4: 0.8,  // May - Rainy season starts
    5: 0.8,  // June
    6: 0.9,  // July
    7: 1.0,  // August
    8: 1.1,  // September
    9: 1.2,  // October - Pre-campaign
    10: 1.3, // November - Campaign season
    11: 1.2, // December - Year-end campaigns
  };

  return seasonalFactors[currentMonth] ?? 1.0;
}
