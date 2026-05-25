export type ModelFitLevel = 'recommended' | 'compatible' | 'heavy' | 'unsupported';

export type ModelCatalogEntry = {
  id: string;
  name: string;
  description: string;
  filename: string;
  downloadUrl: string;
  /** Approximate file size in MB (for UI) */
  sizeMb: number;
  /** Minimum device RAM in MB to run comfortably */
  minRamMb: number;
  contextSize: number;
  maxPredict: number;
  tier: 'light' | 'balanced' | 'quality';
};

export type ModelCatalogItem = ModelCatalogEntry & {
  fit: ModelFitLevel;
  fitLabel: string;
  downloaded: boolean;
  isActive: boolean;
};

export type DeviceSpecSummary = {
  totalRamMb: number;
  freeStorageMb: number | null;
  platform: string;
};
