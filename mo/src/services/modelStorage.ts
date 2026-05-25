import RNFS from 'react-native-fs';
import { MODEL_CATALOG, getCatalogEntry, getDefaultCatalogEntry } from '../config/modelCatalog';
import { ensureDatabaseReady, getDatabase } from '../db/database';
import { ensureDirectory, ensureStorageReady, storagePaths } from '../storage/paths';
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

export const getModelFilePath = (filename: string): string => {
  const safeName = filename.trim();
  if (!storagePaths.models) {
    throw new Error('Storage not ready. Call ensureStorageReady() first.');
  }
  return `${storagePaths.models}/${safeName}`;
};

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
  const path = await resolveModelFilePath(modelId);
  return path !== null;
};

/** Canonical on-disk path for a catalog model (handles stale DB paths). */
export const resolveModelFilePath = async (
  modelId: string,
  storedPath?: string,
): Promise<string | null> => {
  await ensureStorageReady();
  const entry = getCatalogEntry(modelId);
  if (!entry) {
    return null;
  }

  const canonical = getModelFilePath(entry.filename);
  if (await RNFS.exists(canonical)) {
    return canonical;
  }

  if (storedPath?.trim() && (await RNFS.exists(storedPath.trim()))) {
    return storedPath.trim();
  }

  return null;
};

/** Find any downloaded GGUF from the catalog and repair models_meta if needed. */
const discoverDownloadedModels = async (): Promise<
  Array<{ modelId: string; filePath: string; sizeBytes: number }>
> => {
  await ensureStorageReady();
  const found: Array<{ modelId: string; filePath: string; sizeBytes: number }> =
    [];

  for (const entry of MODEL_CATALOG) {
    const path = await resolveModelFilePath(entry.id);
    if (!path) {
      continue;
    }

    const stat = await RNFS.stat(path);
    found.push({
      modelId: entry.id,
      filePath: path,
      sizeBytes: Number(stat.size),
    });
  }

  return found;
};

const repairModelRegistry = async (): Promise<void> => {
  const onDisk = await discoverDownloadedModels();
  if (onDisk.length === 0) {
    return;
  }

  const db = getDatabase();
  for (const row of onDisk) {
    const existing = await db.execute(
      'SELECT id FROM models_meta WHERE model_id = ?',
      [row.modelId],
    );
    if (existing.rows.length === 0) {
      await db.execute(
        `INSERT INTO models_meta (model_id, file_path, size_bytes, is_active, downloaded_at)
         VALUES (?, ?, ?, 0, ?)`,
        [row.modelId, row.filePath, row.sizeBytes, new Date().toISOString()],
      );
      console.log('[NexioAI] Repaired models_meta for on-disk model:', row.modelId);
    } else {
      await db.execute(
        'UPDATE models_meta SET file_path = ?, size_bytes = ? WHERE model_id = ?',
        [row.filePath, row.sizeBytes, row.modelId],
      );
    }
  }
};

export const getActiveModel = async (): Promise<ActiveModelInfo | null> => {
  await ensureDatabaseReady();
  await ensureStorageReady();
  await repairModelRegistry();

  const db = getDatabase();
  const settingRow = await db.execute(
    "SELECT value FROM settings WHERE key = 'active_model_id'",
  );
  const preferredId =
    settingRow.rows.length > 0
      ? rowString(settingRow.rows[0] as SqlRow, 'value')
      : null;

  const installed = await listInstalledModels();
  const tryRow = async (
    modelId: string,
    storedPath: string,
    sizeBytes: number | null,
  ): Promise<ActiveModelInfo | null> => {
    const entry = getCatalogEntry(modelId);
    const filePath = await resolveModelFilePath(modelId, storedPath);
    if (!entry || !filePath) {
      return null;
    }

    return {
      modelId,
      filePath,
      sizeBytes,
      entry,
    };
  };

  if (preferredId) {
    const preferred = installed.find(row => row.modelId === preferredId);
    const resolved = await tryRow(
      preferredId,
      preferred?.filePath ?? '',
      preferred?.sizeBytes ?? null,
    );
    if (resolved) {
      return resolved;
    }
  }

  const active = installed.find(row => row.isActive);
  if (active) {
    const resolved = await tryRow(
      active.modelId,
      active.filePath,
      active.sizeBytes,
    );
    if (resolved) {
      return resolved;
    }
  }

  for (const row of installed) {
    const resolved = await tryRow(row.modelId, row.filePath, row.sizeBytes);
    if (resolved) {
      await setActiveModel(row.modelId);
      return resolved;
    }
  }

  const onDisk = await discoverDownloadedModels();
  if (onDisk.length > 0) {
    const pick = onDisk[0];
    await registerDownloadedModel(
      pick.modelId,
      pick.filePath,
      pick.sizeBytes,
      true,
    );
    const entry = getCatalogEntry(pick.modelId);
    if (entry) {
      console.log('[NexioAI] Auto-selected on-disk model:', pick.modelId);
      return {
        modelId: pick.modelId,
        filePath: pick.filePath,
        sizeBytes: pick.sizeBytes,
        entry,
      };
    }
  }

  console.log('[NexioAI] No downloadable model found on device');
  return null;
};

export const setActiveModel = async (modelId: string): Promise<void> => {
  await ensureDatabaseReady();
  const entry = getCatalogEntry(modelId);
  if (!entry) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  const path = await resolveModelFilePath(modelId);
  if (!path) {
    throw new Error('Download this model before setting it as active.');
  }

  const db = getDatabase();
  await db.execute('UPDATE models_meta SET is_active = 0');
  await db.execute('UPDATE models_meta SET is_active = 1 WHERE model_id = ?', [
    modelId,
  ]);
  await db.execute(
    'UPDATE models_meta SET file_path = ? WHERE model_id = ?',
    [path, modelId],
  );
  await db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('active_model_id', ?)`,
    [modelId],
  );

  console.log('[NexioAI] Active model set:', modelId, path);
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
  await ensureStorageReady();

  const entry = getCatalogEntry(modelId) ?? getDefaultCatalogEntry();
  const dest = getModelFilePath(entry.filename);
  await ensureDirectory(storagePaths.models);

  const partial = `${dest}.download`;
  if (await RNFS.exists(partial)) {
    await RNFS.unlink(partial);
  }

  console.log('[NexioAI] Downloading model:', entry.id, '→', dest);

  const job = RNFS.downloadFile({
    fromUrl: entry.downloadUrl,
    toFile: partial,
    headers: { 'User-Agent': 'NexioAI-Mobile/1.0' },
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
