import RNFS from 'react-native-fs';
import { getCatalogEntry, getDefaultCatalogEntry } from '../config/modelCatalog';
import { getDatabase } from '../db/database';
import { storagePaths } from '../storage/paths';
import type { ModelCatalogEntry } from '../types/models';

type SqlRow = Record<string, unknown>;

export type InstalledModelInfo = {
  modelId: string;
  filePath: string;
  sizeBytes: number | null;
  isActive: boolean;
  downloadedAt: string | null;
};

export type ActiveModelInfo = {
  modelId: string;
  filePath: string;
  sizeBytes: number | null;
  entry: ModelCatalogEntry;
};

export type DownloadProgress = {
  bytesWritten: number;
  contentLength: number;
  percent: number;
};

const rowString = (row: SqlRow, key: string): string => String(row[key] ?? '');

export const getModelFilePath = (filename: string): string =>
  `${storagePaths.models}/${filename}`;

export const listInstalledModels = async (): Promise<InstalledModelInfo[]> => {
  const db = getDatabase();
  const result = await db.execute(
    `SELECT model_id, file_path, size_bytes, is_active, downloaded_at
     FROM models_meta
     ORDER BY downloaded_at DESC`,
  );

  return (result.rows as SqlRow[]).map(row => ({
    modelId: rowString(row, 'model_id'),
    filePath: rowString(row, 'file_path'),
    sizeBytes: row.size_bytes != null ? Number(row.size_bytes) : null,
    isActive: Number(row.is_active) === 1,
    downloadedAt: row.downloaded_at ? rowString(row, 'downloaded_at') : null,
  }));
};

export const isModelDownloaded = async (modelId: string): Promise<boolean> => {
  const entry = getCatalogEntry(modelId);
  if (!entry) {
    return false;
  }

  return RNFS.exists(getModelFilePath(entry.filename));
};

export const getActiveModel = async (): Promise<ActiveModelInfo | null> => {
  const installed = await listInstalledModels();
  const active = installed.find(row => row.isActive);

  if (active) {
    const entry = getCatalogEntry(active.modelId);
    if (entry && (await RNFS.exists(active.filePath))) {
      return {
        modelId: active.modelId,
        filePath: active.filePath,
        sizeBytes: active.sizeBytes,
        entry,
      };
    }
  }

  for (const row of installed) {
    const entry = getCatalogEntry(row.modelId);
    if (entry && (await RNFS.exists(row.filePath))) {
      await setActiveModel(row.modelId);
      return {
        modelId: row.modelId,
        filePath: row.filePath,
        sizeBytes: row.sizeBytes,
        entry,
      };
    }
  }

  return null;
};

export const setActiveModel = async (modelId: string): Promise<void> => {
  const entry = getCatalogEntry(modelId);
  if (!entry) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const path = getModelFilePath(entry.filename);
  const exists = await RNFS.exists(path);
  if (!exists) {
    throw new Error('Download this model before setting it as active.');
  }

  const db = getDatabase();
  await db.execute('UPDATE models_meta SET is_active = 0');
  await db.execute('UPDATE models_meta SET is_active = 1 WHERE model_id = ?', [
    modelId,
  ]);
  await db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('active_model_id', ?)`,
    [modelId],
  );

  console.log('[NexioAI] Active model set:', modelId);
};

const registerDownloadedModel = async (
  modelId: string,
  path: string,
  sizeBytes: number,
  makeActive: boolean,
): Promise<void> => {
  const db = getDatabase();
  const now = new Date().toISOString();

  const existing = await db.execute(
    'SELECT id FROM models_meta WHERE model_id = ?',
    [modelId],
  );

  if (existing.rows.length > 0) {
    await db.execute(
      `UPDATE models_meta
       SET file_path = ?, size_bytes = ?, downloaded_at = ?, is_active = ?
       WHERE model_id = ?`,
      [path, sizeBytes, now, makeActive ? 1 : 0, modelId],
    );
  } else {
    await db.execute(
      `INSERT INTO models_meta (model_id, file_path, size_bytes, is_active, downloaded_at)
       VALUES (?, ?, ?, ?, ?)`,
      [modelId, path, sizeBytes, makeActive ? 1 : 0, now],
    );
  }

  if (makeActive) {
    await db.execute('UPDATE models_meta SET is_active = 0');
    await db.execute('UPDATE models_meta SET is_active = 1 WHERE model_id = ?', [
      modelId,
    ]);
    await db.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('active_model_id', ?)`,
      [modelId],
    );
  }
};

export const downloadModel = async (
  modelId: string,
  onProgress?: (progress: DownloadProgress) => void,
  options?: { setActive?: boolean },
): Promise<string> => {
  const entry = getCatalogEntry(modelId) ?? getDefaultCatalogEntry();
  const dest = getModelFilePath(entry.filename);
  const dir = storagePaths.models;

  if (!(await RNFS.exists(dir))) {
    await RNFS.mkdir(dir);
  }

  const partial = `${dest}.download`;
  if (await RNFS.exists(partial)) {
    await RNFS.unlink(partial);
  }

  console.log('[NexioAI] Downloading model:', entry.id, '→', dest);

  const job = RNFS.downloadFile({
    fromUrl: entry.downloadUrl,
    toFile: partial,
    headers: { 'User-Agent': 'NexioAI-Mobile/1.0' },
    background: true,
    discretionary: true,
    progressInterval: 500,
    progress: res => {
      const contentLength = res.contentLength || 1;
      onProgress?.({
        bytesWritten: res.bytesWritten,
        contentLength,
        percent: Math.round((res.bytesWritten / contentLength) * 100),
      });
    },
  });

  const result = await job.promise;
  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(`Model download failed (HTTP ${result.statusCode})`);
  }

  if (await RNFS.exists(dest)) {
    await RNFS.unlink(dest);
  }
  await RNFS.moveFile(partial, dest);

  const stat = await RNFS.stat(dest);
  const makeActive = options?.setActive ?? true;
  await registerDownloadedModel(modelId, dest, Number(stat.size), makeActive);

  return dest;
};

export const deleteModel = async (modelId: string): Promise<void> => {
  const entry = getCatalogEntry(modelId);
  if (!entry) {
    return;
  }

  const path = getModelFilePath(entry.filename);
  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }

  const db = getDatabase();
  await db.execute('DELETE FROM models_meta WHERE model_id = ?', [modelId]);

  const remaining = await listInstalledModels();
  if (remaining.length > 0 && !remaining.some(row => row.isActive)) {
    await setActiveModel(remaining[0].modelId);
  }

  console.log('[NexioAI] Deleted model:', modelId);
};

/** @deprecated use downloadModel('tinyllama-q4') */
export const downloadDefaultModel = (
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> => downloadModel('tinyllama-q4', onProgress);

/** @deprecated */
export const isModelOnDisk = async (): Promise<boolean> => {
  const active = await getActiveModel();
  return active !== null;
};
