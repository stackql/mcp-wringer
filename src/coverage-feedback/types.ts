export interface CoverageProvider {
  readonly environmentVariable: string;
  collect(directory: string): Promise<ReadonlySet<string>>;
}

export interface CoverageSelection {
  provider: string;
  batchSize: number;
}

export interface CoverageFeedbackResult {
  provider: string;
  batches: number;
  generatorBatches: string[];
  features: number;
  newFeatures: number;
}
