/**
 * VaxTrace Nigeria - Crystal Ball ML Algorithms
 *
 * Phase 2: Lightweight ML Algorithms
 * - Exponential Smoothing (ETS) for consumption forecasting
 * - Isolation Forest for anomaly detection
 * - Random Forest for risk level classification
 *
 * Phase 3: Advanced ML Algorithms
 * - LSTM networks for complex patterns
 * - Ensemble methods for higher accuracy
 * - Transfer learning framework
 *
 * @author VaxTrace Team
 * @version 2.0.0
 */

// ============================================
// TYPES & INTERFACES
// ============================================

export interface TimeSeriesData {
  date: Date;
  value: number;
}

export interface AnomalyData {
  value: number;
  timestamp: Date;
  context?: {
    [key: string]: number | string;
  };
}

export interface ClassificationFeatures {
  currentStock: number;
  avgDailyConsumption: number;
  daysUntilStockout: number;
  expiryRisk: number;
  capacityUtilization: number;
  temperatureDeviation: number;
  dataQuality: number;
  seasonalityFactor: number;
}

export interface ClassificationResult {
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  probabilities: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export interface LSTMModelConfig {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
  numLayers: number;
  dropout: number;
  learningRate: number;
}

export interface EnsemblePrediction {
  prediction: number;
  confidence: number;
  modelContributions: {
    [modelName: string]: {
      prediction: number;
      weight: number;
    };
  };
}

// ============================================
// PHASE 2: LIGHTWEIGHT ML ALGORITHMS
// ============================================

// --------------------------------------------
// EXPONENTIAL SMOOTHING (ETS) FOR CONSUMPTION FORECASTING
// --------------------------------------------

/**
 * Exponential Smoothing (ETS) Model
 * 
 * Triple Exponential Smoothing (Holt-Winters) for time series with:
 * - Level (baseline)
 * - Trend (direction)
 * - Seasonality (repeating patterns)
 * 
 * Formulas:
 * Level_t = α * Y_t + (1 - α) * (Level_{t-1} + Trend_{t-1})
 * Trend_t = β * (Level_t - Level_{t-1}) + (1 - β) * Trend_{t-1}
 * Season_t = γ * (Y_t / Level_t) + (1 - γ) * Season_{t-p}
 * Forecast_t+h = (Level_t + h * Trend_t) * Season_{t-p+h}
 */
export class ExponentialSmoothingModel {
  private alpha: number;  // Level smoothing
  private beta: number;   // Trend smoothing
  private gamma: number;  // Seasonality smoothing
  private period: number; // Seasonal period (e.g., 7 for weekly, 12 for monthly)
  
  private level: number = 0;
  private trend: number = 0;
  private seasonality: number[] = [];
  private fitted: boolean = false;

  constructor(
    alpha: number = 0.3,
    beta: number = 0.1,
    gamma: number = 0.2,
    period: number = 7
  ) {
    this.alpha = alpha;
    this.beta = beta;
    this.gamma = gamma;
    this.period = period;
  }

  /**
   * Fit the ETS model to historical data
   */
  fit(data: TimeSeriesData[]): void {
    if (data.length < this.period * 2) {
      throw new Error(`Need at least ${this.period * 2} data points for ETS model`);
    }

    const values = data.map(d => d.value);

    // Initialize level and trend using first two points
    this.level = values[0];
    this.trend = (values[1] - values[0]) / 1;

    // Initialize seasonality using first period
    this.seasonality = new Array(this.period).fill(0);
    for (let i = 0; i < this.period; i++) {
      const avg = values.slice(i, i + this.period).reduce((a, b) => a + b, 0) / this.period;
      this.seasonality[i] = values[i] / avg;
    }

    // Fit model using Holt-Winters equations
    for (let t = 0; t < values.length; t++) {
      const y = values[t];
      const seasonIdx = t % this.period;

      const prevLevel = this.level;
      const prevTrend = this.trend;

      // Update level
      this.level = this.alpha * (y / this.seasonality[seasonIdx]) + 
                   (1 - this.alpha) * (prevLevel + prevTrend);

      // Update trend
      this.trend = this.beta * (this.level - prevLevel) + 
                   (1 - this.beta) * prevTrend;

      // Update seasonality
      this.seasonality[seasonIdx] = this.gamma * (y / this.level) + 
                                     (1 - this.gamma) * this.seasonality[seasonIdx];
    }

    this.fitted = true;
  }

  /**
   * Forecast future values
   */
  forecast(horizon: number): number[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const forecasts: number[] = [];
    const lastLevel = this.level;
    const lastTrend = this.trend;

    for (let h = 1; h <= horizon; h++) {
      const seasonIdx = (this.seasonality.length - 1 + h) % this.period;
      const forecast = (lastLevel + h * lastTrend) * this.seasonality[seasonIdx];
      forecasts.push(Math.max(0, forecast)); // Ensure non-negative
    }

    return forecasts;
  }

  /**
   * Get prediction intervals (confidence bands)
   */
  getPredictionIntervals(forecasts: number[], confidence: number = 0.95): Array<{ lower: number; upper: number }> {
    // Simplified prediction intervals based on forecast magnitude
    const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.645;
    
    return forecasts.map(f => {
      const stdError = f * 0.15; // Assume 15% standard error
      return {
        lower: Math.max(0, f - zScore * stdError),
        upper: f + zScore * stdError,
      };
    });
  }
}

/**
 * Train ETS model and forecast consumption
 */
export function forecastConsumption(
  historicalData: TimeSeriesData[],
  forecastHorizon: number = 30
): {
  forecast: number[];
  predictionIntervals: Array<{ lower: number; upper: number }>;
  model: ExponentialSmoothingModel;
} {
  const model = new ExponentialSmoothingModel(0.3, 0.1, 0.2, 7);
  model.fit(historicalData);
  
  const forecast = model.forecast(forecastHorizon);
  const predictionIntervals = model.getPredictionIntervals(forecast);

  return { forecast, predictionIntervals, model };
}

// --------------------------------------------
// ISOLATION FOREST FOR ANOMALY DETECTION
// --------------------------------------------

/**
 * Simplified Isolation Forest for anomaly detection
 * 
 * Algorithm:
 * 1. Build random decision trees by randomly selecting features and split points
 * 2. Anomalies are isolated faster (shorter path lengths)
 * 3. Calculate anomaly score based on average path length
 */
export class IsolationForest {
  private trees: IsolationTree[] = [];
  private numTrees: number;
  private subSamplingSize: number;
  private maxDepth: number;

  constructor(
    numTrees: number = 100,
    subSamplingSize: number = 256,
    maxDepth: number = 8
  ) {
    this.numTrees = numTrees;
    this.subSamplingSize = subSamplingSize;
    this.maxDepth = maxDepth;
  }

  /**
   * Fit the isolation forest
   */
  fit(data: AnomalyData[]): void {
    this.trees = [];
    const features = this.extractFeatures(data);

    for (let i = 0; i < this.numTrees; i++) {
      // Subsample data
      const sample = this.subsample(features, this.subSamplingSize);
      const tree = new IsolationTree(this.maxDepth);
      tree.build(sample);
      this.trees.push(tree);
    }
  }

  /**
   * Calculate anomaly scores for new data
   * Returns scores between 0 (normal) and 1 (anomaly)
   */
  predict(data: AnomalyData[]): number[] {
    const features = this.extractFeatures(data);
    const scores: number[] = [];

    for (const feature of features) {
      const pathLengths = this.trees.map(tree => tree.pathLength(feature));
      const avgPathLength = pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length;
      
      // Convert path length to anomaly score
      const score = Math.pow(2, -avgPathLength / this.expectedPathLength(this.subSamplingSize));
      scores.push(score);
    }

    return scores;
  }

  /**
   * Detect anomalies with threshold
   */
  detectAnomalies(data: AnomalyData[], threshold: number = 0.5): AnomalyData[] {
    const scores = this.predict(data);
    return data.filter((_, i) => scores[i] > threshold);
  }

  private extractFeatures(data: AnomalyData[]): number[][] {
    return data.map(d => [d.value]);
  }

  private subsample(data: number[][], size: number): number[][] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(size, data.length));
  }

  private expectedPathLength(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

/**
 * Isolation Tree - Single tree in the forest
 */
class IsolationTree {
  private root: TreeNode | null = null;
  private maxDepth: number;

  constructor(maxDepth: number) {
    this.maxDepth = maxDepth;
  }

  build(data: number[][], depth: number = 0): TreeNode {
    if (data.length <= 1 || depth >= this.maxDepth) {
      return { isLeaf: true, size: data.length };
    }

    // Randomly select feature and split point
    const featureIdx = Math.floor(Math.random() * data[0].length);
    const values = data.map(d => d[featureIdx]);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const splitPoint = minVal + Math.random() * (maxVal - minVal);

    // Split data
    const leftData = data.filter(d => d[featureIdx] < splitPoint);
    const rightData = data.filter(d => d[featureIdx] >= splitPoint);

    const node: TreeNode = {
      isLeaf: false,
      featureIdx,
      splitPoint,
      left: this.build(leftData, depth + 1),
      right: this.build(rightData, depth + 1),
    };

    if (depth === 0) {
      this.root = node;
    }

    return node;
  }

  pathLength(feature: number[]): number {
    return this.traverse(this.root!, feature, 0);
  }

  private traverse(node: TreeNode, feature: number[], depth: number): number {
    if (node.isLeaf) {
      return depth + this.c(node.size);
    }

    const nextFeature = feature[node.featureIdx] < node.splitPoint ? node.left : node.right;
    return this.traverse(nextFeature, feature, depth + 1);
  }

  private c(n: number): number {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }
}

interface TreeNode {
  isLeaf: boolean;
  size?: number;
  featureIdx?: number;
  splitPoint?: number;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * Detect anomalies in stock movements
 */
export function detectStockAnomalies(
  stockData: AnomalyData[],
  threshold: number = 0.5
): {
  anomalies: AnomalyData[];
  scores: number[];
  model: IsolationForest;
} {
  const model = new IsolationForest(100, 256, 8);
  model.fit(stockData);
  
  const scores = model.predict(stockData);
  const anomalies = stockData.filter((_, i) => scores[i] > threshold);

  return { anomalies, scores, model };
}

// --------------------------------------------
// RANDOM FOREST FOR RISK LEVEL CLASSIFICATION
// --------------------------------------------

/**
 * Simplified Random Forest Classifier
 * 
 * Algorithm:
 * 1. Build multiple decision trees on bootstrapped samples
 * 2. Random feature selection at each split
 * 3. Aggregate predictions by majority voting
 */
export class RandomForestClassifier {
  private trees: DecisionTree[] = [];
  private numTrees: number;
  private maxDepth: number;
  private minSamplesSplit: number;
  private numFeatures: number;
  private classes: string[] = [];

  constructor(
    numTrees: number = 50,
    maxDepth: number = 10,
    minSamplesSplit: number = 2,
    numFeatures: number = -1 // -1 means use sqrt of total features
  ) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.numFeatures = numFeatures;
  }

  /**
   * Fit the random forest
   */
  fit(features: ClassificationFeatures[], labels: string[]): void {
    this.classes = [...new Set(labels)];
    const numFeaturesPerSplit = this.numFeatures === -1 
      ? Math.floor(Math.sqrt(features[0] ? Object.keys(features[0]).length : 1))
      : this.numFeatures;

    this.trees = [];
    for (let i = 0; i < this.numTrees; i++) {
      // Bootstrap sample
      const sample = this.bootstrapSample(features, labels);
      const tree = new DecisionTree(this.maxDepth, this.minSamplesSplit, numFeaturesPerSplit);
      tree.fit(sample.features, sample.labels);
      this.trees.push(tree);
    }
  }

  /**
   * Predict class probabilities
   */
  predictProba(features: ClassificationFeatures): { [className: string]: number } {
    const votes: { [className: string]: number } = {};
    
    for (const tree of this.trees) {
      const prediction = tree.predict(features);
      votes[prediction] = (votes[prediction] || 0) + 1;
    }

    // Convert to probabilities
    const probabilities: { [className: string]: number } = {};
    for (const cls of this.classes) {
      probabilities[cls] = (votes[cls] || 0) / this.numTrees;
    }

    return probabilities;
  }

  /**
   * Predict class
   */
  predict(features: ClassificationFeatures): string {
    const probabilities = this.predictProba(features);
    return Object.entries(probabilities).reduce((a, b) => 
      a[1] > b[1] ? a : b
    )[0];
  }

  /**
   * Get feature importances
   */
  getFeatureImportances(): { [featureName: string]: number } {
    const importances: { [featureName: string]: number } = {};
    
    for (const tree of this.trees) {
      const treeImportances = tree.getFeatureImportances();
      for (const [feature, importance] of Object.entries(treeImportances)) {
        importances[feature] = (importances[feature] || 0) + importance;
      }
    }

    // Normalize
    const total = Object.values(importances).reduce((a, b) => a + b, 0);
    for (const feature of Object.keys(importances)) {
      importances[feature] /= total;
    }

    return importances;
  }

  private bootstrapSample(
    features: ClassificationFeatures[],
    labels: string[]
  ): { features: ClassificationFeatures[]; labels: string[] } {
    const n = features.length;
    const sampledFeatures: ClassificationFeatures[] = [];
    const sampledLabels: string[] = [];

    for (let i = 0; i < n; i++) {
      const idx = Math.floor(Math.random() * n);
      sampledFeatures.push(features[idx]);
      sampledLabels.push(labels[idx]);
    }

    return { features: sampledFeatures, labels: sampledLabels };
  }
}

/**
 * Decision Tree - Single tree in the forest
 */
class DecisionTree {
  private root: DecisionNode | null = null;
  private maxDepth: number;
  private minSamplesSplit: number;
  private numFeatures: number;
  private featureNames: string[] = [];

  constructor(maxDepth: number, minSamplesSplit: number, numFeatures: number) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.numFeatures = numFeatures;
  }

  fit(features: ClassificationFeatures[], labels: string[]): void {
    this.featureNames = Object.keys(features[0] || {});
    this.root = this.buildTree(features, labels, 0);
  }

  predict(features: ClassificationFeatures): string {
    return this.traverse(this.root!, features);
  }

  getFeatureImportances(): { [featureName: string]: number } {
    const importances: { [featureName: string]: number } = {};
    this.calculateImportances(this.root!, importances);
    return importances;
  }

  private buildTree(
    features: ClassificationFeatures[],
    labels: string[],
    depth: number
  ): DecisionNode {
    // Stopping conditions
    if (depth >= this.maxDepth || labels.length < this.minSamplesSplit || this.isPure(labels)) {
      return { isLeaf: true, class: this.majorityClass(labels) };
    }

    // Find best split
    const { featureIdx, splitValue, gain } = this.findBestSplit(features, labels);

    if (gain === 0) {
      return { isLeaf: true, class: this.majorityClass(labels) };
    }

    // Split data
    const leftFeatures: ClassificationFeatures[] = [];
    const leftLabels: string[] = [];
    const rightFeatures: ClassificationFeatures[] = [];
    const rightLabels: string[] = [];

    const featureKey = this.featureNames[featureIdx];

    for (let i = 0; i < features.length; i++) {
      if ((features[i] as any)[featureKey] < splitValue) {
        leftFeatures.push(features[i]);
        leftLabels.push(labels[i]);
      } else {
        rightFeatures.push(features[i]);
        rightLabels.push(labels[i]);
      }
    }

    return {
      isLeaf: false,
      featureIdx,
      splitValue,
      left: this.buildTree(leftFeatures, leftLabels, depth + 1),
      right: this.buildTree(rightFeatures, rightLabels, depth + 1),
    };
  }

  private findBestSplit(
    features: ClassificationFeatures[],
    labels: string[]
  ): { featureIdx: number; splitValue: number; gain: number } {
    let bestGain = 0;
    let bestFeature = 0;
    let bestSplit = 0;

    // Randomly select features to consider
    const featureIndices = this.getRandomFeatureIndices();

    for (const featureIdx of featureIndices) {
      const values = features.map(f => (f as any)[this.featureNames[featureIdx]]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);

      for (const splitValue of uniqueValues) {
        const gain = this.calculateInformationGain(features, labels, featureIdx, splitValue);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = featureIdx;
          bestSplit = splitValue;
        }
      }
    }

    return { featureIdx: bestFeature, splitValue: bestSplit, gain: bestGain };
  }

  private calculateInformationGain(
    features: ClassificationFeatures[],
    labels: string[],
    featureIdx: number,
    splitValue: number
  ): number {
    const parentImpurity = this.giniImpurity(labels);
    
    const leftLabels: string[] = [];
    const rightLabels: string[] = [];
    const featureKey = this.featureNames[featureIdx];

    for (let i = 0; i < features.length; i++) {
      if ((features[i] as any)[featureKey] < splitValue) {
        leftLabels.push(labels[i]);
      } else {
        rightLabels.push(labels[i]);
      }
    }

    const n = labels.length;
    const weightedImpurity = 
      (leftLabels.length / n) * this.giniImpurity(leftLabels) +
      (rightLabels.length / n) * this.giniImpurity(rightLabels);

    return parentImpurity - weightedImpurity;
  }

  private giniImpurity(labels: string[]): number {
    if (labels.length === 0) return 0;
    const counts: { [label: string]: number } = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    let impurity = 1;
    for (const count of Object.values(counts)) {
      impurity -= Math.pow(count / labels.length, 2);
    }
    return impurity;
  }

  private isPure(labels: string[]): boolean {
    return new Set(labels).size === 1;
  }

  private majorityClass(labels: string[]): string {
    const counts: { [label: string]: number } = {};
    for (const label of labels) {
      counts[label] = (counts[label] || 0) + 1;
    }
    return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private traverse(node: DecisionNode, features: ClassificationFeatures): string {
    if (node.isLeaf) {
      return node.class;
    }
    const featureKey = this.featureNames[node.featureIdx!];
    const nextNode = (features as any)[featureKey] < node.splitValue! ? node.left! : node.right!;
    return this.traverse(nextNode, features);
  }

  private getRandomFeatureIndices(): number[] {
    const indices = Array.from({ length: this.featureNames.length }, (_, i) => i);
    // Shuffle and take first numFeatures
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, Math.min(this.numFeatures, indices.length));
  }

  private calculateImportances(node: DecisionNode, importances: { [featureName: string]: number }): void {
    if (node.isLeaf) return;
    
    const featureName = this.featureNames[node.featureIdx!];
    importances[featureName] = (importances[featureName] || 0) + 1;
    
    this.calculateImportances(node.left!, importances);
    this.calculateImportances(node.right!, importances);
  }
}

interface DecisionNode {
  isLeaf: boolean;
  class?: string;
  featureIdx?: number;
  splitValue?: number;
  left?: DecisionNode;
  right?: DecisionNode;
}

/**
 * Classify risk level using Random Forest
 */
export function classifyRiskLevel(
  features: ClassificationFeatures,
  trainingFeatures: ClassificationFeatures[],
  trainingLabels: string[]
): ClassificationResult {
  const model = new RandomForestClassifier(50, 10, 2, -1);
  model.fit(trainingFeatures, trainingLabels);
  
  const probabilities = model.predictProba(features);
  const prediction = model.predict(features);
  
  // Calculate confidence as margin between top two probabilities
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

// ============================================
// PHASE 3: ADVANCED ML ALGORITHMS
// ============================================

// --------------------------------------------
// LSTM NETWORK FOR COMPLEX PATTERNS
// --------------------------------------------

/**
 * LSTM Network Configuration and Interface
 * 
 * Note: This is a TypeScript interface for LSTM integration.
 * Actual implementation would use TensorFlow.js or similar library.
 * 
 * LSTM Architecture:
 * - Input Layer: Sequence of historical data
 * - LSTM Layers: Capture temporal dependencies
 * - Dropout Layers: Prevent overfitting
 * - Dense Output Layer: Prediction
 */
export class LSTMNetwork {
  private config: LSTMModelConfig;
  private trained: boolean = false;

  constructor(config: LSTMModelConfig) {
    this.config = config;
  }

  /**
   * Train LSTM model on time series data
   * 
   * @param sequences - Array of input sequences
   * @param targets - Array of target values
   * @param epochs - Number of training epochs
   * @param batchSize - Training batch size
   */
  async train(
    sequences: number[][],
    targets: number[],
    epochs: number = 100,
    batchSize: number = 32
  ): Promise<void> {
    // In production, this would use TensorFlow.js:
    // const model = tf.sequential();
    // model.add(tf.layers.lstm({ units: this.config.hiddenSize, returnSequences: true }));
    // model.add(tf.layers.dropout({ rate: this.config.dropout }));
    // model.add(tf.layers.lstm({ units: this.config.hiddenSize }));
    // model.add(tf.layers.dense({ units: this.config.outputSize }));
    // model.compile({ optimizer: tf.train.adam(this.config.learningRate), loss: 'mse' });
    // await model.fit(xs, ys, { epochs, batchSize });
    
    this.trained = true;
  }

  /**
   * Predict using trained LSTM model
   */
  async predict(sequence: number[]): Promise<number> {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }
    
    // In production: return await model.predict(xs).data();
    return 0; // Placeholder
  }

  /**
   * Forecast multiple steps ahead
   */
  async forecast(sequence: number[], steps: number): Promise<number[]> {
    const forecasts: number[] = [];
    let currentSequence = [...sequence];

    for (let i = 0; i < steps; i++) {
      const prediction = await this.predict(currentSequence);
      forecasts.push(prediction);
      currentSequence = [...currentSequence.slice(1), prediction];
    }

    return forecasts;
  }
}

/**
 * Create and train LSTM for consumption forecasting
 */
export async function createLSTMForecaster(
  historicalData: TimeSeriesData[],
  config?: Partial<LSTMModelConfig>
): Promise<LSTMNetwork> {
  const defaultConfig: LSTMModelConfig = {
    inputSize: 30,  // 30 days lookback
    hiddenSize: 64,
    outputSize: 1,
    numLayers: 2,
    dropout: 0.2,
    learningRate: 0.001,
  };

  const lstm = new LSTMNetwork({ ...defaultConfig, ...config });

  // Prepare sequences
  const values = historicalData.map(d => d.value);
  const sequences: number[][] = [];
  const targets: number[] = [];

  const lookback = defaultConfig.inputSize;
  for (let i = lookback; i < values.length; i++) {
    sequences.push(values.slice(i - lookback, i));
    targets.push(values[i]);
  }

  await lstm.train(sequences, targets);

  return lstm;
}

// --------------------------------------------
// ENSEMBLE METHODS FOR HIGHER ACCURACY
// --------------------------------------------

/**
 * Ensemble Predictor - Combines multiple models
 * 
 * Methods:
 * - Simple Average: Equal weight to all models
 * - Weighted Average: Weight by model performance
 * - Stacking: Meta-learner on top of base models
 */
export class EnsemblePredictor {
  private models: Map<string, any> = new Map();
  private weights: Map<string, number> = new Map();
  private method: 'average' | 'weighted' | 'stacking' = 'weighted';

  constructor(method: 'average' | 'weighted' | 'stacking' = 'weighted') {
    this.method = method;
  }

  /**
   * Add a model to the ensemble
   */
  addModel(name: string, model: any, weight: number = 1): void {
    this.models.set(name, model);
    this.weights.set(name, weight);
  }

  /**
   * Make ensemble prediction
   */
  async predict(input: any): Promise<EnsemblePrediction> {
    const predictions: { [name: string]: number } = {};
    let totalWeight = 0;

    for (const [name, model] of this.models.entries()) {
      let prediction: number;
      
      // Handle different model types
      if (model instanceof ExponentialSmoothingModel) {
        const forecast = model.forecast(1);
        prediction = forecast[0];
      } else if (model instanceof LSTMNetwork) {
        prediction = await model.predict(input);
      } else if (typeof model.predict === 'function') {
        prediction = model.predict(input);
      } else {
        continue;
      }

      predictions[name] = prediction;
      totalWeight += this.weights.get(name) || 1;
    }

    // Calculate weighted average
    let weightedSum = 0;
    for (const [name, prediction] of Object.entries(predictions)) {
      const weight = (this.weights.get(name) || 1) / totalWeight;
      weightedSum += prediction * weight;
    }

    // Calculate confidence based on model agreement
    const values = Object.values(predictions);
    const mean = weightedSum;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const confidence = Math.max(0, 1 - Math.sqrt(variance) / mean);

    return {
      prediction: weightedSum,
      confidence: Math.round(confidence * 100),
      modelContributions: Object.fromEntries(
        Object.entries(predictions).map(([name, pred]) => [
          name,
          { prediction: pred, weight: (this.weights.get(name) || 1) / totalWeight },
        ])
      ),
    };
  }

  /**
   * Update model weights based on performance
   */
  updateWeights(performanceScores: { [modelName: string]: number }): void {
    const totalScore = Object.values(performanceScores).reduce((a, b) => a + b, 0);
    
    for (const [name, score] of Object.entries(performanceScores)) {
      this.weights.set(name, score / totalScore);
    }
  }
}

/**
 * Create ensemble for consumption forecasting
 */
export function createConsumptionEnsemble(): EnsemblePredictor {
  const ensemble = new EnsemblePredictor('weighted');
  
  // In production, add trained models:
  // ensemble.addModel('ets', etsModel, 0.3);
  // ensemble.addModel('lstm', lstmModel, 0.4);
  // ensemble.addModel('arima', arimaModel, 0.3);
  
  return ensemble;
}

// --------------------------------------------
// TRANSFER LEARNING FRAMEWORK
// --------------------------------------------

/**
 * Transfer Learning Manager
 * 
 * Enables knowledge transfer from similar supply chains
 * 
 * Strategy:
 * 1. Pre-train on large datasets from similar facilities
 * 2. Fine-tune on target facility data
 * 3. Adapt to local patterns
 */
export class TransferLearningManager {
  private baseModels: Map<string, any> = new Map();
  private adaptedModels: Map<string, any> = new Map();

  /**
   * Load a pre-trained base model
   */
  loadBaseModel(name: string, model: any): void {
    this.baseModels.set(name, model);
  }

  /**
   * Adapt base model to target facility
   */
  async adaptModel(
    baseModelName: string,
    targetData: TimeSeriesData[],
    adaptationRate: number = 0.1
  ): Promise<any> {
    const baseModel = this.baseModels.get(baseModelName);
    if (!baseModel) {
      throw new Error(`Base model ${baseModelName} not found`);
    }

    // Clone base model
    const adaptedModel = { ...baseModel };

    // Fine-tune on target data
    if (adaptedModel instanceof ExponentialSmoothingModel) {
      const values = targetData.map(d => ({ date: d.date, value: d.value }));
      adaptedModel.fit(values.slice(-30)); // Fine-tune on last 30 days
    }

    this.adaptedModels.set(baseModelName, adaptedModel);
    return adaptedModel;
  }

  /**
   * Get adapted model or fall back to base
   */
  getModel(name: string): any {
    return this.adaptedModels.get(name) || this.baseModels.get(name);
  }

  /**
   * Find similar facilities for transfer learning
   */
  findSimilarFacilities(
    targetFacilityData: TimeSeriesData[],
    facilityDatabase: Map<string, TimeSeriesData[]>,
    topK: number = 5
  ): string[] {
    const similarities: { facilityId: string; similarity: number }[] = [];

    const targetStats = this.calculateStatistics(targetFacilityData);

    for (const [facilityId, data] of facilityDatabase.entries()) {
      const stats = this.calculateStatistics(data);
      const similarity = this.calculateSimilarity(targetStats, stats);
      similarities.push({ facilityId, similarity });
    }

    // Sort by similarity and return top K
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, topK).map(s => s.facilityId);
  }

  private calculateStatistics(data: TimeSeriesData[]): {
    mean: number;
    std: number;
    trend: number;
    seasonality: number;
  } {
    const values = data.map(d => d.value);
    const n = values.length;
    
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    // Simple linear trend
    const trend = (values[n - 1] - values[0]) / n;
    
    // Seasonality strength (simplified)
    const period = 7;
    let seasonality = 0;
    for (let i = period; i < n; i++) {
      seasonality += Math.abs(values[i] - values[i - period]);
    }
    seasonality /= (n - period);

    return { mean, std, trend, seasonality };
  }

  private calculateSimilarity(
    stats1: ReturnType<typeof this.calculateStatistics>,
    stats2: ReturnType<typeof this.calculateStatistics>
  ): number {
    // Normalized similarity score
    const meanDiff = Math.abs(stats1.mean - stats2.mean) / (stats1.mean + stats2.mean);
    const stdDiff = Math.abs(stats1.std - stats2.std) / (stats1.std + stats2.std);
    const trendDiff = Math.abs(stats1.trend - stats2.trend) / (Math.abs(stats1.trend) + Math.abs(stats2.trend) + 1);
    
    return 1 - (meanDiff + stdDiff + trendDiff) / 3;
  }
}

/**
 * Initialize transfer learning system
 */
export function createTransferLearningSystem(): TransferLearningManager {
  const manager = new TransferLearningManager();
  
  // In production, load pre-trained models:
  // manager.loadBaseModel('consumption-ets', pretrainedETS);
  // manager.loadBaseModel('consumption-lstm', pretrainedLSTM);
  
  return manager;
}

// ============================================
// MODEL VERSIONING AND A/B TESTING
// ============================================

/**
 * Model Registry for versioning
 */
export class ModelRegistry {
  private models: Map<string, { version: string; model: any; metrics: any }> = new Map();
  private currentVersion: string = '';

  /**
   * Register a new model version
   */
  registerModel(name: string, version: string, model: any, metrics: any): void {
    const key = `${name}:${version}`;
    this.models.set(key, { version, model, metrics });
  }

  /**
   * Get model by version
   */
  getModel(name: string, version?: string): any {
    if (version) {
      return this.models.get(`${name}:${version}`)?.model;
    }
    return this.models.get(`${name}:${this.currentVersion}`)?.model;
  }

  /**
   * Set current model version
   */
  setCurrentVersion(name: string, version: string): void {
    this.currentVersion = version;
  }

  /**
   * Compare model versions
   */
  compareVersions(name: string, version1: string, version2: string): any {
    const model1 = this.models.get(`${name}:${version1}`);
    const model2 = this.models.get(`${name}:${version2}`);

    return {
      version1: model1?.metrics,
      version2: model2?.metrics,
      better: (model1?.metrics.accuracy || 0) > (model2?.metrics.accuracy || 0) ? version1 : version2,
    };
  }
}

/**
 * A/B Testing Framework
 */
export class ABTestingFramework {
  private experiments: Map<string, {
    modelA: any;
    modelB: any;
    trafficSplit: number;
    results: { modelA: number[]; modelB: number[] };
  }> = new Map();

  /**
   * Create an A/B test
   */
  createExperiment(
    name: string,
    modelA: any,
    modelB: any,
    trafficSplit: number = 0.5
  ): void {
    this.experiments.set(name, {
      modelA,
      modelB,
      trafficSplit,
      results: { modelA: [], modelB: [] },
    });
  }

  /**
   * Get model for request (A or B based on traffic split)
   */
  getModelForRequest(experimentName: string, requestId: string): any {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Experiment ${experimentName} not found`);
    }

    // Hash-based consistent assignment
    const hash = requestId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const normalized = Math.abs(hash) / Math.pow(2, 31);

    return normalized < experiment.trafficSplit ? experiment.modelA : experiment.modelB;
  }

  /**
   * Record result
   */
  recordResult(experimentName: string, model: 'A' | 'B', metric: number): void {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) return;

    const key = model === 'A' ? 'modelA' : 'modelB';
    experiment.results[key].push(metric);
  }

  /**
   * Get experiment statistics
   */
  getExperimentStats(experimentName: string): {
    modelA: { mean: number; count: number };
    modelB: { mean: number; count: number };
    winner: 'A' | 'B' | 'TIE';
    significance: number;
  } {
    const experiment = this.experiments.get(experimentName);
    if (!experiment) {
      throw new Error(`Experiment ${experimentName} not found`);
    }

    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const meanA = mean(experiment.results.modelA);
    const meanB = mean(experiment.results.modelB);

    // Simple t-test for significance
    const pooledStd = Math.sqrt(
      (experiment.results.modelA.reduce((s, x) => s + Math.pow(x - meanA, 2), 0) +
       experiment.results.modelB.reduce((s, x) => s + Math.pow(x - meanB, 2), 0)) /
      (experiment.results.modelA.length + experiment.results.modelB.length - 2)
    );
    const se = pooledStd * Math.sqrt(1 / experiment.results.modelA.length + 1 / experiment.results.modelB.length);
    const tStat = Math.abs(meanA - meanB) / se;
    const significance = tStat > 1.96 ? 0.95 : tStat > 1.64 ? 0.90 : 0.8;

    return {
      modelA: { mean: meanA, count: experiment.results.modelA.length },
      modelB: { mean: meanB, count: experiment.results.modelB.length },
      winner: meanA > meanB ? 'A' : meanB > meanA ? 'B' : 'TIE',
      significance,
    };
  }
}
