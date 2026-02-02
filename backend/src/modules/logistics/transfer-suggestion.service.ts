/**
 * VaxTrace Nigeria - Transfer Suggestion Service
 * 
 * This service implements the "Distance-Weighted Stock Balancing" algorithm
 * to suggest optimal vaccine redistribution between LGAs.
 * 
 * Algorithm Logic:
 * 1. Identify LGAs with critical stock levels (below minimum threshold)
 * 2. Find nearby LGAs with surplus stock (above safety buffer)
 * 3. Calculate transfer scores based on:
 *    - Distance (travel time)
 *    - Stock availability
 *    - Vehicle availability
 *    - Road conditions
 * 4. Rank suggestions by overall score
 * 
 * Features:
 * - Geospatial proximity analysis
 * - Multi-criteria decision making
 * - Real-time vehicle tracking
 * - Road network consideration
 * - Confidence scoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ============================================
// TYPES
// ============================================

interface StockLevel {
  facilityId: string;
  facilityName: string;
  lgaId: string;
  lgaName: string;
  stateId: string;
  stateName: string;
  vaccineId: string;
  vaccineName: string;
  quantityOnHand: number;
  averageMonthlyConsumption: number;
  monthsOfStock: number;
  latitude: number;
  longitude: number;
}

interface TransferSuggestion {
  sourceLGA: {
    id: string;
    name: string;
    stockLevel: number;
    monthsOfStock: number;
  };
  targetLGA: {
    id: string;
    name: string;
    stockLevel: number;
    monthsOfStock: number;
  };
  vaccine: {
    id: string;
    name: string;
  };
  suggestedQuantity: number;
  distance: {
    km: number;
    estimatedTravelTime: number; // minutes
  };
  confidenceScore: number; // 0-1
  riskFactors: string[];
  benefits: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface VehicleAvailability {
  vehicleId: string;
  type: 'REFRIGERATED_TRUCK' | 'VAN' | 'MOTORCYCLE';
  currentLocation: string;
  availableAt: Date;
  capacity: number; // vials
}

// ============================================
// CONSTANTS
// ============================================

const MIN_MOS_THRESHOLD = 1.0; // 1 month minimum
const SAFETY_BUFFER_MOS = 4.0; // 4 months safety buffer
const MAX_TRANSFER_DISTANCE_KM = 100; // Maximum distance for transfer
const CONFIDENCE_THRESHOLD = 0.6;

// ============================================
// SERVICE
// ============================================

@Injectable()
export class TransferSuggestionService {
  private readonly logger = new Logger(TransferSuggestionService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates transfer suggestions for a given LGA
   * 
   * @param targetLGAId - The LGA ID that needs stock
   * @param vaccineId - The vaccine to transfer
   * @returns Array of transfer suggestions ranked by priority
   */
  async generateSuggestions(
    targetLGAId: string,
    vaccineId: string
  ): Promise<TransferSuggestion[]> {
    this.logger.log(`Generating transfer suggestions for LGA: ${targetLGAId}`);

    // 1. Get target LGA stock levels
    const targetStock = await this.getStockLevels(targetLGAId, vaccineId);
    
    if (!targetStock || targetStock.monthsOfStock >= MIN_MOS_THRESHOLD) {
      // No transfer needed
      return [];
    }

    // 2. Get nearby LGAs with potential surplus
    const nearbyLGAs = await this.getNearbyLGAs(
      targetStock.latitude,
      targetStock.longitude,
      MAX_TRANSFER_DISTANCE_KM
    );

    // 3. Filter for LGAs with surplus stock
    const surplusLGAs = await this.filterSurplusLGAs(
      nearbyLGAs,
      vaccineId,
      SAFETY_BUFFER_MOS
    );

    // 4. Calculate transfer scores
    const suggestions: TransferSuggestion[] = [];

    for (const surplusLGA of surplusLGAs) {
      const suggestion = await this.calculateTransferSuggestion(
        targetStock,
        surplusLGA
      );

      if (suggestion && suggestion.confidenceScore >= CONFIDENCE_THRESHOLD) {
        suggestions.push(suggestion);
      }
    }

    // 5. Rank by priority and confidence
    suggestions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.confidenceScore - a.confidenceScore;
    });

    this.logger.log(`Generated ${suggestions.length} transfer suggestions`);
    
    return suggestions;
  }

  /**
   * Calculates a transfer suggestion between two LGAs
   */
  private async calculateTransferSuggestion(
    target: StockLevel,
    source: StockLevel
  ): Promise<TransferSuggestion | null> {
    // Calculate distance
    const distance = this.calculateDistance(
      target.latitude,
      target.longitude,
      source.latitude,
      source.longitude
    );

    // Calculate travel time (assuming average speed of 40 km/h)
    const estimatedTravelTime = (distance / 40) * 60; // minutes

    // Calculate suggested quantity
    const deficit = this.calculateStockDeficit(target);
    const surplus = this.calculateStockSurplus(source);
    const suggestedQuantity = Math.min(deficit, surplus);

    if (suggestedQuantity <= 0) {
      return null;
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore({
      distance,
      sourceStock: source.monthsOfStock,
      targetStock: target.monthsOfStock,
      travelTime: estimatedTravelTime,
    });

    // Determine priority
    const priority = this.calculatePriority(target.monthsOfStock);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors({
      distance,
      sourceLGA: source.lgaName,
      targetLGA: target.lgaName,
      travelTime: estimatedTravelTime,
    });

    // Identify benefits
    const benefits = this.identifyBenefits({
      targetLGA: target.lgaName,
      suggestedQuantity,
      currentMOS: target.monthsOfStock,
      projectedMOS: target.monthsOfStock + (suggestedQuantity / target.averageMonthlyConsumption),
    });

    return {
      sourceLGA: {
        id: source.lgaId,
        name: source.lgaName,
        stockLevel: source.quantityOnHand,
        monthsOfStock: source.monthsOfStock,
      },
      targetLGA: {
        id: target.lgaId,
        name: target.lgaName,
        stockLevel: target.quantityOnHand,
        monthsOfStock: target.monthsOfStock,
      },
      vaccine: {
        id: target.vaccineId,
        name: target.vaccineName,
      },
      suggestedQuantity,
      distance: {
        km: distance,
        estimatedTravelTime,
      },
      confidenceScore,
      riskFactors,
      benefits,
      priority,
    };
  }

  /**
   * Calculates the Haversine distance between two coordinates
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculates stock deficit for target LGA
   */
  private calculateStockDeficit(stock: StockLevel): number {
    const targetMOS = MIN_MOS_THRESHOLD;
    const targetQuantity = targetMOS * stock.averageMonthlyConsumption;
    const deficit = targetQuantity - stock.quantityOnHand;
    
    return Math.max(0, deficit);
  }

  /**
   * Calculates stock surplus for source LGA
   */
  private calculateStockSurplus(stock: StockLevel): number {
    const surplusQuantity = stock.quantityOnHand - (SAFETY_BUFFER_MOS * stock.averageMonthlyConsumption);
    
    return Math.max(0, surplusQuantity);
  }

  /**
   * Calculates confidence score for a transfer
   * 
   * Factors:
   * - Distance (closer is better)
   * - Source stock level (more surplus is better)
   * - Travel time (faster is better)
   */
  private calculateConfidenceScore(params: {
    distance: number;
    sourceStock: number;
    targetStock: number;
    travelTime: number;
  }): number {
    let score = 1.0;

    // Distance penalty (0.1 per 10km)
    score -= (params.distance / 10) * 0.1;

    // Source stock bonus (0.05 per month above safety buffer)
    const surplusMonths = params.sourceStock - SAFETY_BUFFER_MOS;
    score += Math.min(surplusMonths * 0.05, 0.2);

    // Travel time penalty (0.01 per 10 minutes)
    score -= (params.travelTime / 10) * 0.01;

    // Urgency bonus (lower target stock = higher score)
    if (params.targetStock < 0.5) {
      score += 0.2;
    } else if (params.targetStock < 1.0) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculates priority level based on stock status
   */
  private calculatePriority(monthsOfStock: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (monthsOfStock < 0.5) return 'CRITICAL';
    if (monthsOfStock < 1.0) return 'HIGH';
    if (monthsOfStock < 2.0) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Identifies risk factors for a transfer
   */
  private identifyRiskFactors(params: {
    distance: number;
    sourceLGA: string;
    targetLGA: string;
    travelTime: number;
  }): string[] {
    const risks: string[] = [];

    if (params.distance > 50) {
      risks.push('Long distance transfer');
    }

    if (params.travelTime > 120) {
      risks.push('Extended travel time (>2 hours)');
    }

    // Check for known security issues (would be from a database)
    // This is a placeholder for actual security data
    const riskyLGAs = ['Borno', 'Yobe', 'Adamawa']; // Example
    if (riskyLGAs.includes(params.sourceLGA) || riskyLGAs.includes(params.targetLGA)) {
      risks.push('Security concerns in region');
    }

    // Check for seasonal road conditions
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 6 && currentMonth <= 9) {
      // Rainy season (June-September)
      risks.push('Rainy season road conditions');
    }

    return risks;
  }

  /**
   * Identifies benefits of a transfer
   */
  private identifyBenefits(params: {
    targetLGA: string;
    suggestedQuantity: number;
    currentMOS: number;
    projectedMOS: number;
  }): string[] {
    const benefits: string[] = [];

    const mosIncrease = params.projectedMOS - params.currentMOS;
    
    if (mosIncrease >= 1.0) {
      benefits.push(`Restores ${params.targetLGA} to optimal stock levels`);
    }

    if (params.projectedMOS >= MIN_MOS_THRESHOLD) {
      benefits.push('Prevents stockout for at least 30 days');
    }

    if (params.suggestedQuantity >= 500) {
      benefits.push('Large transfer - economies of scale');
    }

    return benefits;
  }

  /**
   * Gets stock levels for an LGA
   * (This would query the database in production)
   */
  private async getStockLevels(
    lgaId: string,
    vaccineId: string
  ): Promise<StockLevel | null> {
    // Placeholder - would query database in production
    return null;
  }

  /**
   * Gets nearby LGAs within a given radius
   * (This would use PostGIS in production)
   */
  private async getNearbyLGAs(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<StockLevel[]> {
    // Placeholder - would use PostGIS ST_DWithin in production
    return [];
  }

  /**
   * Filters LGAs for surplus stock
   */
  private async filterSurplusLGAs(
    lgas: StockLevel[],
    vaccineId: string,
    minMOS: number
  ): Promise<StockLevel[]> {
    // Placeholder - would query database in production
    return lgas.filter((lga) => 
      lga.vaccineId === vaccineId && lga.monthsOfStock > minMOS
    );
  }

  /**
   * Gets available vehicles for transfer
   */
  async getAvailableVehicles(
    sourceLGAId: string,
    requiredCapacity: number
  ): Promise<VehicleAvailability[]> {
    // Placeholder - would query vehicle tracking system
    return [];
  }

  /**
   * Creates a redistribution order in OpenLMIS
   */
  async createRedistributionOrder(
    suggestion: TransferSuggestion
  ): Promise<string> {
    this.logger.log(
      `Creating redistribution order: ${suggestion.sourceLGA.name} -> ${suggestion.targetLGA.name}`
    );

    // This would call the OpenLMIS API to create a requisition
    // Return the requisition ID
    
    return 'requisition-id-placeholder';
  }
}
