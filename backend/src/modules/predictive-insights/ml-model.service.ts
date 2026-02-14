/**
 * VaxTrace Nigeria - ML Model Service
 *
 * Integrates Phase 2 (Lightweight ML) and Phase 3 (Advanced ML) algorithms
 * into the predictive insights system.
 *
 * @author VaxTrace Team
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  // Phase 2: Lightweight ML
  ExponentialSmoothingModel,
  IsolationForest,
  RandomForestClassifier,
  forecastConsumption,
  detectStockAnomalies,
  classifyRiskLevel,
  
  // Phase 3: Advanced ML
  LSTMNetwork,
  EnsemblePredictor,
  TransferLearningManager,
  ModelRegistry,
  ABTestingFramework,
  createLSTMForecaster,
  createConsumptionEnsemble,
  createTransferLearningSystem,
  
  // Types
  type TimeSeriesData,
  type AnomalyData,
  type ClassificationFeatures,
  type ClassificationResult,
  type EnsemblePrediction,
} from './algorithms/ml-algorithms';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ModelTrainingConfig {
  ets?: {
    alpha?: number;
    beta?: number;
    gamma?: number;
    period?: number;
  };
  isolationForest?: {
    numTrees?: number;
    subSamplingSize?: number;
    maxDepth?: number;
    threshold?: number;
  };
  randomForest?: {
    numTrees?: number;
    maxDepth?: number;
    minSamplesSplit?: number;
  };
  lstm?: {
    inputSize?: number;
    hiddenSize?: number;
    outputSize?: number;
    numLayers?: number;
    dropout?: number;
    learningRate?: number;
  };
}

export interface MLModelStatus {
  phase: 1 | 2 | 3;
  etsModel: boolean;
  isolationForestModel: boolean;
  randomForestModel: boolean;
  lstmModel: boolean;
  ensembleModel: boolean;
  transferLearningEnabled: boolean;
  lastTrained: Date | null;
}

export interface ConsumptionForecastResult {
  forecast: number[];
  predictionIntervals: Array<{ lower: number; upper: number }>;
  confidence: number;
  method: 'rule-based' | 'ets' | 'lstm' | 'ensemble';
}

export interface AnomalyDetectionResult {
  anomalies: AnomalyData[];
  scores: number[];
  threshold: number;
  anomalyCount: number;
}

// ============================================
// ML MODEL SERVICE
// ============================================

@Injectable()
export class MLModelService {
  private readonly logger = new Logger(MLModelService.name);

  // Phase 2 Models
  private etsModel: ExponentialSmoothingModel | null = null;
  private isolationForest: IsolationForest | null = null;
  private randomForest: RandomForestClassifier | null = null;

  // Phase 3 Models
  private lstmModel: LSTMNetwork | null = null;
  private ensemblePredictor: EnsemblePredictor | null = null;
  private transferLearning: TransferLearningManager | null = null;

  // Model Management
  private modelRegistry: ModelRegistry;
  private abTesting: ABTestingFramework;
  private currentPhase: 1 | 2 | 3 = 1;
  private lastTrained: Date | null = null;

  // Training Data Storage
  private trainingData: {
    consumption: TimeSeriesData[];
    stockMovements: AnomalyData[];
    classification: { features: ClassificationFeatures[]; labels: string[] };
  } = {
    consumption: [],
    stockMovements: [],
    classification: { features: [], labels: [] },
  };

  constructor(private readonly configService: ConfigService) {
    this.modelRegistry = new ModelRegistry();
    this.abTesting = new ABTestingFramework();
    this.logger.log('ML Model Service initialized');
  }

  // ============================================
  // PHASE 2: LIGHTWEIGHT ML METHODS
  // ============================================

  /**
   * Train Exponential Smoothing (ETS) model for consumption forecasting
   */
  trainETSModel(data: TimeSeriesData[], config?: ModelTrainingConfig['ets']): void {
    this.logger.log('Training ETS model...');
    
    const alpha = config?.alpha ?? 0.3;
    const beta = config?.beta ?? 0.1;
    const gamma = config?.gamma ?? 0.2;
    const period = config?.period ?? 7;

    this.etsModel = new ExponentialSmoothingModel(alpha, beta, gamma, period);
    this.etsModel.fit(data);
    
    this.trainingData.consumption = data;
    this.lastTrained = new Date();
    this.currentPhase = (this.currentPhase >= 2 ? this.currentPhase : 2) as 1 | 2 | 3;
    
    this.logger.log(`ETS model trained with ${data.length} data points`);
  }

  /**
   * Forecast consumption using ETS
   */
  forecastConsumption(
    horizon: number = 30,
    useML: boolean = true
  ): ConsumptionForecastResult {
    if (useML && this.etsModel) {
      const forecast = this.etsModel.forecast(horizon);
      const predictionIntervals = this.etsModel.getPredictionIntervals(forecast);
      
      return {
        forecast,
        predictionIntervals,
        confidence: 85, // ETS typically provides good confidence
        method: 'ets',
      };
    }

    // Fall back to rule-based forecasting
    this.logger.debug('Using rule-based forecasting (ETS not trained)');
    const lastValue = this.trainingData.consumption[this.trainingData.consumption.length - 1]?.value ?? 0;
    const forecast = Array(horizon).fill(lastValue);
    const predictionIntervals = forecast.map(f => ({
      lower: f * 0.8,
      upper: f * 1.2,
    }));

    return {
      forecast,
      predictionIntervals,
      confidence: 70,
      method: 'rule-based',
    };
  }

  /**
   * Train Isolation Forest for anomaly detection
   */
  trainIsolationForest(data: AnomalyData[], config?: ModelTrainingConfig['isolationForest']): void {
    this.logger.log('Training Isolation Forest...');

    const numTrees = config?.numTrees ?? 100;
    const subSamplingSize = config?.subSamplingSize ?? 256;
    const maxDepth = config?.maxDepth ?? 8;

    this.isolationForest = new IsolationForest(numTrees, subSamplingSize, maxDepth);
    this.isolationForest.fit(data);
    
    this.trainingData.stockMovements = data;
    this.lastTrained = new Date();
    this.currentPhase = (this.currentPhase >= 2 ? this.currentPhase : 2) as 1 | 2 | 3;
    
    this.logger.log(`Isolation Forest trained with ${data.length} data points`);
  }

  /**
   * Detect anomalies in stock movements
   */
  detectAnomalies(data: AnomalyData[], threshold: number = 0.5): AnomalyDetectionResult {
    if (this.isolationForest) {
      const scores = this.isolationForest.predict(data);
      const anomalies = data.filter((_, i) => scores[i] > threshold);

      return {
        anomalies,
        scores,
        threshold,
        anomalyCount: anomalies.length,
      };
    }

    // Fall back to simple statistical anomaly detection
    this.logger.debug('Using statistical anomaly detection (Isolation Forest not trained)');
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    const zScores = values.map(v => Math.abs((v - mean) / std));
    const anomalies = data.filter((_, i) => zScores[i] > 2);

    return {
      anomalies,
      scores: zScores.map(z => Math.min(1, z / 3)),
      threshold,
      anomalyCount: anomalies.length,
    };
  }

  /**
   * Train Random Forest for risk classification
   */
  trainRandomForest(
    features: ClassificationFeatures[],
    labels: string[],
    config?: ModelTrainingConfig['randomForest']
  ): void {
    this.logger.log('Training Random Forest...');

    const numTrees = config?.numTrees ?? 50;
    const maxDepth = config?.maxDepth ?? 10;
    const minSamplesSplit = config?.minSamplesSplit ?? 2;

    this.randomForest = new RandomForestClassifier(numTrees, maxDepth, minSamplesSplit);
    this.randomForest.fit(features, labels);
    
    this.trainingData.classification = { features, labels };
    this.lastTrained = new Date();
    this.currentPhase = (this.currentPhase >= 2 ? this.currentPhase : 2) as 1 | 2 | 3;
    
    this.logger.log(`Random Forest trained with ${features.length} samples`);
  }

  /**
   * Classify risk level using Random Forest
   */
  classifyRisk(features: ClassificationFeatures): ClassificationResult {
    if (this.randomForest) {
      const probabilities = this.randomForest.predictProba(features);
      const prediction = this.randomForest.predict(features);
      
      const sortedProbs = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
      const confidence = sortedProbs[0][1] - (sortedProbs[1]?.[1] || 0);

      return {
        riskLevel: prediction as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        confidence: Math.round(confidence * 100),
        probabilities: {
          CRITICAL: probabilities.CRITICAL || 0,
          HIGH: probabilities.HIGH || 0,
          MEDIUM: probabilities.MEDIUM || 0,
          LOW: probabilities.LOW || 0,
        },
      };
    }

    // Fall back to rule-based classification
    this.logger.debug('Using rule-based classification (Random Forest not trained)');
    return this.ruleBasedClassification(features);
  }

  // ============================================
  // PHASE 3: ADVANCED ML METHODS
  // ============================================

  /**
   * Train LSTM model for complex pattern recognition
   */
  async trainLSTMModel(
    data: TimeSeriesData[],
    config?: ModelTrainingConfig['lstm']
  ): Promise<void> {
    this.logger.log('Training LSTM model...');

    this.lstmModel = await createLSTMForecaster(data, config);
    
    this.lastTrained = new Date();
    this.currentPhase = 3;
    
    this.logger.log('LSTM model trained successfully');
  }

  /**
   * Forecast using LSTM
   */
  async forecastWithLSTM(sequence: number[], steps: number): Promise<number[]> {
    if (!this.lstmModel) {
      throw new Error('LSTM model not trained');
    }

    return await this.lstmModel.forecast(sequence, steps);
  }

  /**
   * Create ensemble predictor
   */
  createEnsemble(method: 'average' | 'weighted' | 'stacking' = 'weighted'): void {
    this.logger.log(`Creating ensemble predictor (${method} method)...`);
    
    this.ensemblePredictor = new EnsemblePredictor(method);
    
    // Add available models to ensemble
    if (this.etsModel) {
      this.ensemblePredictor.addModel('ets', this.etsModel, 0.3);
    }
    if (this.lstmModel) {
      this.ensemblePredictor.addModel('lstm', this.lstmModel, 0.4);
    }
    // Add more models as they become available
    
    this.currentPhase = 3;
    this.logger.log('Ensemble predictor created');
  }

  /**
   * Make ensemble prediction
   */
  async predictWithEnsemble(input: any): Promise<EnsemblePrediction> {
    if (!this.ensemblePredictor) {
      throw new Error('Ensemble predictor not initialized');
    }

    return await this.ensemblePredictor.predict(input);
  }

  /**
   * Initialize transfer learning
   */
  initializeTransferLearning(): void {
    this.logger.log('Initializing transfer learning system...');
    
    this.transferLearning = createTransferLearningSystem();
    this.currentPhase = 3;
    
    this.logger.log('Transfer learning system initialized');
  }

  /**
   * Find similar facilities for transfer learning
   */
  findSimilarFacilities(
    targetData: TimeSeriesData[],
    facilityDatabase: Map<string, TimeSeriesData[]>,
    topK: number = 5
  ): string[] {
    if (!this.transferLearning) {
      throw new Error('Transfer learning not initialized');
    }

    return this.transferLearning.findSimilarFacilities(targetData, facilityDatabase, topK);
  }

  /**
   * Adapt model from similar facility
   */
  async adaptModel(
    baseModelName: string,
    targetData: TimeSeriesData[],
    adaptationRate: number = 0.1
  ): Promise<any> {
    if (!this.transferLearning) {
      throw new Error('Transfer learning not initialized');
    }

    return await this.transferLearning.adaptModel(baseModelName, targetData, adaptationRate);
  }

  // ============================================
  // MODEL MANAGEMENT
  // ============================================

  /**
   * Register model version
   */
  registerModelVersion(name: string, version: string, model: any, metrics: any): void {
    this.modelRegistry.registerModel(name, version, model, metrics);
    this.logger.log(`Registered model ${name} version ${version}`);
  }

  /**
   * Get model by version
   */
  getModel(name: string, version?: string): any {
    return this.modelRegistry.getModel(name, version);
  }

  /**
   * Set current model version
   */
  setCurrentModelVersion(name: string, version: string): void {
    this.modelRegistry.setCurrentVersion(name, version);
    this.logger.log(`Set ${name} to version ${version}`);
  }

  /**
   * Compare model versions
   */
  compareModelVersions(name: string, version1: string, version2: string): any {
    return this.modelRegistry.compareVersions(name, version1, version2);
  }

  /**
   * Create A/B test
   */
  createABTest(
    experimentName: string,
    modelA: any,
    modelB: any,
    trafficSplit: number = 0.5
  ): void {
    this.abTesting.createExperiment(experimentName, modelA, modelB, trafficSplit);
    this.logger.log(`Created A/B test: ${experimentName}`);
  }

  /**
   * Get model for A/B test request
   */
  getModelForABTest(experimentName: string, requestId: string): any {
    return this.abTesting.getModelForRequest(experimentName, requestId);
  }

  /**
   * Record A/B test result
   */
  recordABTestResult(experimentName: string, model: 'A' | 'B', metric: number): void {
    this.abTesting.recordResult(experimentName, model, metric);
  }

  /**
   * Get A/B test statistics
   */
  getABTestStats(experimentName: string): any {
    return this.abTesting.getExperimentStats(experimentName);
  }

  /**
   * Get current ML model status
   */
  getModelStatus(): MLModelStatus {
    return {
      phase: this.currentPhase,
      etsModel: this.etsModel !== null,
      isolationForestModel: this.isolationForest !== null,
      randomForestModel: this.randomForest !== null,
      lstmModel: this.lstmModel !== null,
      ensembleModel: this.ensemblePredictor !== null,
      transferLearningEnabled: this.transferLearning !== null,
      lastTrained: this.lastTrained,
    };
  }

  /**
   * Get feature importances from Random Forest
   */
  getFeatureImportances(): { [featureName: string]: number } | null {
    if (this.randomForest) {
      return this.randomForest.getFeatureImportances();
    }
    return null;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Rule-based classification fallback
   */
  private ruleBasedClassification(features: ClassificationFeatures): ClassificationResult {
    const { daysUntilStockout, expiryRisk, capacityUtilization } = features;

    let riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    const scores = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    // Stockout risk
    if (daysUntilStockout <= 7) scores.CRITICAL += 0.4;
    else if (daysUntilStockout <= 14) scores.HIGH += 0.3;
    else if (daysUntilStockout <= 30) scores.MEDIUM += 0.2;
    else scores.LOW += 0.1;

    // Expiry risk
    if (expiryRisk > 20) scores.CRITICAL += 0.3;
    else if (expiryRisk > 10) scores.HIGH += 0.2;
    else if (expiryRisk > 5) scores.MEDIUM += 0.1;
    else scores.LOW += 0.05;

    // Capacity risk
    if (capacityUtilization > 90) scores.CRITICAL += 0.3;
    else if (capacityUtilization > 80) scores.HIGH += 0.2;
    else if (capacityUtilization > 70) scores.MEDIUM += 0.1;
    else scores.LOW += 0.05;

    // Determine risk level
    const maxScore = Math.max(...Object.values(scores));
    riskLevel = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as any;

    // Normalize scores to probabilities
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const probabilities = {
      CRITICAL: scores.CRITICAL / totalScore,
      HIGH: scores.HIGH / totalScore,
      MEDIUM: scores.MEDIUM / totalScore,
      LOW: scores.LOW / totalScore,
    };

    return {
      riskLevel,
      confidence: Math.round(maxScore * 100),
      probabilities,
    };
  }

  /**
   * Determine which ML phase to use based on data availability
   */
  private determineMLPhase(dataPoints: number): 1 | 2 | 3 {
    if (dataPoints < 30) {
      return 1; // Rule-based
    } else if (dataPoints < 365) {
      return 2; // Lightweight ML
    } else {
      return 3; // Advanced ML
    }
  }
}
