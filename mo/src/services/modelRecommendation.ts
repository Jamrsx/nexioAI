import { MODEL_CATALOG } from '../config/modelCatalog';
import type {
  DeviceSpecSummary,
  ModelCatalogEntry,
  ModelCatalogItem,
  ModelFitLevel,
} from '../types/models';
import { listInstalledModels } from './modelStorage';

const fitLabel: Record<ModelFitLevel, string> = {
  recommended: 'Recommended for your device',
  compatible: 'Runs on your device',
  heavy: 'May be slow or unstable',
  unsupported: 'Not enough RAM',
};

export const scoreModelFit = (
  entry: ModelCatalogEntry,
  totalRamMb: number,
  freeStorageMb: number | null,
): ModelFitLevel => {
  if (totalRamMb < entry.minRamMb) {
    return 'unsupported';
  }

  if (freeStorageMb != null && freeStorageMb < entry.sizeMb + 200) {
    return 'unsupported';
  }

  const headroom = totalRamMb / entry.minRamMb;

  if (headroom >= 1.8) {
    return 'recommended';
  }

  if (headroom >= 1.2) {
    return 'compatible';
  }

  return 'heavy';
};

export const buildModelCatalogItems = async (
  specs: DeviceSpecSummary,
): Promise<ModelCatalogItem[]> => {
  const installed = await listInstalledModels();
  const installedMap = new Map(installed.map(row => [row.modelId, row]));
  const activeId = installed.find(row => row.isActive)?.modelId;

  const items = MODEL_CATALOG.map(entry => {
    const fit = scoreModelFit(entry, specs.totalRamMb, specs.freeStorageMb);

    return {
      ...entry,
      fit,
      fitLabel: fitLabel[fit],
      downloaded: installedMap.has(entry.id),
      isActive: activeId === entry.id,
    };
  });

  const order: Record<ModelFitLevel, number> = {
    recommended: 0,
    compatible: 1,
    heavy: 2,
    unsupported: 3,
  };

  return items.sort((a, b) => order[a.fit] - order[b.fit] || a.sizeMb - b.sizeMb);
};

export const getTopRecommendation = (
  items: ModelCatalogItem[],
): ModelCatalogItem | null =>
  items.find(item => item.fit === 'recommended') ??
  items.find(item => item.fit === 'compatible') ??
  null;

export const formatDeviceSummary = (specs: DeviceSpecSummary): string => {
  const storage =
    specs.freeStorageMb != null
      ? `${specs.freeStorageMb} MB free`
      : 'storage unknown';

  return `${specs.totalRamMb} MB RAM · ${storage} · ${specs.platform}`;
};
